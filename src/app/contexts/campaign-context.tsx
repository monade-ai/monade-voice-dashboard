'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { useCampaignHistory } from '@/app/hooks/use-campaign-history';

// Types
export interface Contact {
    phoneNumber: string;
    calleeInfo: Record<string, string>;
}

export interface CampaignResult {
    phoneNumber: string;
    calleeInfo: Record<string, string>;
    call_id: string;
    call_status: 'pending' | 'calling' | 'completed' | 'no_answer' | 'failed';
    transcript: string;
    analytics?: {
        verdict?: string;
        confidence_score?: number;
        summary?: string;
        call_quality?: string;
        key_discoveries?: Record<string, any>;
    } | null;
    analyticsLoaded?: boolean;
}

export type CampaignStatus = 'idle' | 'ready' | 'running' | 'fetching_results' | 'fetching_analytics' | 'completed' | 'error';

interface CampaignContextType {
    contacts: Contact[];
    results: CampaignResult[];
    campaignStatus: CampaignStatus;
    progress: number;
    currentCallIndex: number;
    fetchProgress: string;
    outputFileName: string;
    selectedAssistantId: string;
    selectedTrunk: string;

    // Actions
    setContacts: (contacts: Contact[]) => void;
    setResults: (results: CampaignResult[]) => void;
    setOutputFileName: (name: string) => void;
    setSelectedAssistantId: (id: string) => void;
    setSelectedTrunk: (trunk: string) => void;
    startCampaign: () => Promise<void>;
    stopCampaign: () => void;
    resetCampaign: () => void;
}

const CampaignContext = createContext<CampaignContextType | null>(null);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
    // State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [results, setResults] = useState<CampaignResult[]>([]);
    const [outputFileName, setOutputFileName] = useState('campaign_results');
    const [selectedAssistantId, setSelectedAssistantId] = useState('');
    const [selectedTrunk, setSelectedTrunk] = useState('vobiz');
    const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [currentCallIndex, setCurrentCallIndex] = useState(0);
    const [fetchProgress, setFetchProgress] = useState('');

    // Refs for runner logic
    const abortControllerRef = useRef<AbortController | null>(null);
    const isRestoredRef = useRef(false);

    // Hooks
    const { assistants } = useAssistants();
    const { apiKey, userUid } = useMonadeUser();
    const { saveCampaign } = useCampaignHistory();

    const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);

    // RESTORE STATE
    useEffect(() => {
        if (!userUid) return;

        const storageKey = `campaign_state_${userUid}`;
        try {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) {
                const state = JSON.parse(saved);
                console.log('[CampaignContext] Restoring state:', state);

                if (state.contacts?.length) setContacts(state.contacts);

                // Fix: Reset any 'calling' results to 'pending' since they were interrupted
                if (state.results?.length) {
                    const fixedResults = state.results.map((r: CampaignResult) => ({
                        ...r,
                        call_status: r.call_status === 'calling' ? 'pending' : r.call_status
                    }));
                    setResults(fixedResults);
                }

                if (state.outputFileName) setOutputFileName(state.outputFileName);
                if (state.selectedAssistantId) setSelectedAssistantId(state.selectedAssistantId);
                if (state.selectedTrunk) setSelectedTrunk(state.selectedTrunk);

                // Fix: If campaign was running/fetching, reset to idle since workers are dead
                if (state.campaignStatus === 'running' ||
                    state.campaignStatus === 'fetching_results' ||
                    state.campaignStatus === 'fetching_analytics') {
                    setCampaignStatus('idle');
                    toast.info('Previous campaign was interrupted. You can start again.');
                } else if (state.campaignStatus) {
                    setCampaignStatus(state.campaignStatus);
                }

                if (state.progress) setProgress(state.progress);
                if (state.currentCallIndex) setCurrentCallIndex(state.currentCallIndex);
                if (state.fetchProgress) setFetchProgress(state.fetchProgress);
            }
        } catch (err) {
            console.error('[CampaignContext] Restore failed:', err);
        } finally {
            isRestoredRef.current = true;
        }
    }, [userUid]);

    // SAVE STATE
    useEffect(() => {
        if (!userUid || !isRestoredRef.current) return;

        const storageKey = `campaign_state_${userUid}`;
        const state = {
            contacts,
            results,
            outputFileName,
            selectedAssistantId,
            selectedTrunk,
            campaignStatus,
            progress,
            currentCallIndex,
            fetchProgress
        };

        if (contacts.length > 0 || campaignStatus !== 'idle') {
            sessionStorage.setItem(storageKey, JSON.stringify(state));
        } else if (isRestoredRef.current && contacts.length === 0 && campaignStatus === 'idle') {
            // Sync empty state if restored
            sessionStorage.setItem(storageKey, JSON.stringify(state));
        }
    }, [userUid, contacts, results, outputFileName, selectedAssistantId, selectedTrunk, campaignStatus, progress, currentCallIndex, fetchProgress]);

    // Format phone number helper
    const formatPhoneNumber = (number: string): string => {
        let formatted = number.replace(/[\s\-()]/g, '');
        if (!formatted.startsWith('+')) {
            formatted = '+' + formatted;
        }
        // Add 91 country code if just 10 digits
        if (formatted.length === 11 && formatted.startsWith('+')) {
            formatted = '+91' + formatted.substring(1);
        }
        return formatted;
    };

    // Make Call API
    const makeCall = async (contact: Contact): Promise<CampaignResult> => {
        const phone = formatPhoneNumber(contact.phoneNumber);

        if (!apiKey) {
            return {
                phoneNumber: contact.phoneNumber,
                calleeInfo: contact.calleeInfo,
                call_id: '',
                call_status: 'failed',
                transcript: 'Error: No API key configured',
                analyticsLoaded: false
            };
        }

        try {
            const response = await fetch('/api/calling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: phone,
                    assistant_id: selectedAssistantId,
                    trunk_name: selectedTrunk,
                    api_key: apiKey,
                    callee_info: contact.calleeInfo
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Call failed');
            }

            const data = await response.json();
            return {
                phoneNumber: contact.phoneNumber,
                calleeInfo: contact.calleeInfo,
                call_id: data.call_id || '',
                call_status: 'completed',
                transcript: '',
                analyticsLoaded: false
            };
        } catch (error) {
            console.error('[Campaign] Call error:', error);
            return {
                phoneNumber: contact.phoneNumber,
                calleeInfo: contact.calleeInfo,
                call_id: '',
                call_status: 'failed',
                transcript: error instanceof Error ? error.message : 'Unknown error',
                analyticsLoaded: false
            };
        }
    };

    // Smart Transcript Fetching - Two Phase Approach
    // Phase 1: Quick detection for no_answer (15 seconds, fast polling)
    // Phase 2: Extended wait for connected calls (up to 5 minutes, slower polling)
    const fetchTranscriptForCall = async (phone: string, startTime: Date): Promise<string> => {
        const formattedPhone = formatPhoneNumber(phone);
        const bufferTime = new Date(startTime.getTime() - 30000);

        // Helper to check for transcript
        const checkForTranscript = async (): Promise<string | null> => {
            try {
                const response = await fetch(`/api/proxy/api/users/${userUid}/transcripts`);
                if (response.ok) {
                    const data = await response.json();
                    const transcripts = Array.isArray(data) ? data : data.transcripts || [];

                    for (const t of transcripts) {
                        const transcriptPhone = t.phone_number || '';
                        const transcriptTime = new Date(t.created_at || '');

                        if (transcriptPhone === formattedPhone && transcriptTime > bufferTime) {
                            const contentResponse = await fetch('/api/transcript-content', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: t.transcript_url })
                            });

                            if (contentResponse.ok) {
                                const data = await contentResponse.json();
                                if (data.transcript && data.transcript.trim()) {
                                    return data.transcript;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Transcript check failed:', err);
            }
            return null;
        };

        // PHASE 1: Quick detection (30s) - for catchin no_answer
        // 10 attempts × 3 seconds = 30 seconds
        console.log(`[Campaign] Phase 1: Quick transcript check for ${formattedPhone}`);
        for (let attempt = 0; attempt < 10; attempt++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const transcript = await checkForTranscript();
            if (transcript) {
                console.log(`[Campaign] Transcript found in Phase 1 for ${formattedPhone}`);
                return transcript;
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // PHASE 2: Extended wait (up to 3 minutes) - for connected calls
        // Poll less frequently (every 10s)
        // 18 attempts × 10 seconds = 180 seconds (3 minutes)
        console.log(`[Campaign] Phase 2: Extended wait for ${formattedPhone} (up to 3 min)`);
        for (let attempt = 0; attempt < 18; attempt++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const transcript = await checkForTranscript();
            if (transcript) {
                console.log(`[Campaign] Transcript found in Phase 2 (attempt ${attempt + 1}) for ${formattedPhone}`);
                return transcript;
            }

            // Less frequent polling in phase 2 (every 10 seconds)
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        // Still no transcript after ~2.75 minutes total - mark as no conversation
        console.log(`[Campaign] No transcript found for ${formattedPhone} after extended wait`);
        return '';
    };

    // Start Campaign
    const startCampaign = async () => {
        if (!selectedAssistantId || !selectedTrunk || !apiKey || !userUid || !contacts.length) {
            toast.error('Missing configuration (Assistant, Trunk, API Key, or User)');
            return;
        }

        abortControllerRef.current = new AbortController();
        const campaignStartTime = new Date();

        setCampaignStatus('running');
        setProgress(0);
        setCurrentCallIndex(0);

        // Init results
        const newResults: CampaignResult[] = contacts.map(c => ({
            phoneNumber: c.phoneNumber,
            calleeInfo: c.calleeInfo,
            call_id: '',
            call_status: 'pending',
            transcript: '',
            analyticsLoaded: false
        }));
        setResults(newResults);

        const totalContacts = contacts.length;
        const MAX_CONCURRENT_CALLS = 10;
        let nextContactIndex = 0;
        let completedCount = 0;

        // This array will hold the latest state for the worker closure
        const processingResults = [...newResults];

        // Worker function
        const processNextContact = async () => {
            while (nextContactIndex < totalContacts) {
                if (abortControllerRef.current?.signal.aborted) break;

                const currentIndex = nextContactIndex++;
                if (currentIndex >= totalContacts) break;

                setCurrentCallIndex(currentIndex);
                const contact = contacts[currentIndex];
                const startTime = new Date();

                // Update status: Calling
                setResults(prev => {
                    const updated = [...prev];
                    updated[currentIndex] = { ...updated[currentIndex], call_status: 'calling' };
                    return updated;
                });

                const result = await makeCall(contact);

                // Fetch transcript immediately if completed
                if (result.call_status === 'completed') {
                    result.transcript = await fetchTranscriptForCall(contact.phoneNumber, startTime);
                    if (!result.transcript) result.call_status = 'no_answer';
                }

                processingResults[currentIndex] = result;
                completedCount++;

                setResults(prev => {
                    const updated = [...prev];
                    updated[currentIndex] = result;
                    return updated;
                });

                setProgress(Math.round((completedCount / totalContacts) * 100));
            }
        };

        const workers = Array(Math.min(MAX_CONCURRENT_CALLS, totalContacts))
            .fill(null)
            .map(() => processNextContact());

        await Promise.all(workers);

        if (abortControllerRef.current?.signal.aborted) {
            setCampaignStatus('idle'); // or 'axed'
            return;
        }

        // Fetching Analytics Phase
        setCampaignStatus('fetching_results');
        setFetchProgress('Waiting for transcripts processing...');
        toast.info('Calls done. Fetching analytics...');

        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15s

        const finalResults = [...processingResults];
        const normalizePhone = (p: string) => p.replace(/\D/g, '').slice(-10);
        const campaignStartBuffer = new Date(campaignStartTime.getTime() - 60000); // 1 min buffer

        for (let idx = 0; idx < finalResults.length; idx++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const res = finalResults[idx];
            setFetchProgress(`Fetching analytics: ${idx + 1}/${finalResults.length}`);

            if (res.call_status === 'failed') {
                finalResults[idx].analyticsLoaded = true;
                setResults([...finalResults]);
                continue;
            }

            const targetPhoneNormalized = normalizePhone(res.phoneNumber);
            let realCallId = '';

            // Step 1: Find the transcript by phone number to get REAL call_id (AJ_*)
            for (let retry = 0; retry < 3; retry++) {
                try {
                    const transcriptsResponse = await fetch(`/api/proxy/api/users/${userUid}/transcripts`);
                    if (transcriptsResponse.ok) {
                        const transcriptsData = await transcriptsResponse.json();
                        const transcripts = Array.isArray(transcriptsData) ? transcriptsData : transcriptsData.transcripts || [];

                        // Find transcript matching phone number AND created after campaign started
                        const matchingTranscript = transcripts.find((t: any) => {
                            const transcriptPhone = normalizePhone(t.phone_number || '');
                            const transcriptTime = new Date(t.created_at || 0);
                            return transcriptPhone === targetPhoneNormalized && transcriptTime > campaignStartBuffer;
                        });

                        if (matchingTranscript) {
                            realCallId = matchingTranscript.call_id; // This is the AJ_* ID
                            console.log(`[Analytics] Found transcript match for ${targetPhoneNormalized}: ${realCallId}`);
                            break;
                        }
                    }
                } catch (err) {
                    console.error('Transcript lookup failed:', err);
                }
                await new Promise(r => setTimeout(r, 2000));
            }

            // Step 2: Fetch analytics using the REAL call_id
            if (realCallId) {
                finalResults[idx].call_id = realCallId; // Update to real call_id

                for (let retry = 0; retry < 3; retry++) {
                    try {
                        const aRes = await fetch(`/api/proxy/api/analytics/${realCallId}`);
                        if (aRes.ok) {
                            const d = await aRes.json();
                            finalResults[idx].analytics = d.analytics || d;
                            console.log(`[Analytics] Got analytics for ${realCallId}:`, finalResults[idx].analytics?.verdict);
                            break;
                        }
                    } catch (e) {
                        console.error('Analytics fetch failed:', e);
                    }
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            finalResults[idx].analyticsLoaded = true;
            setResults([...finalResults]);
        }

        // SAVE HISTORY
        // Truncate transcripts for storage
        const storageResults = finalResults.map(r => ({
            ...r,
            transcript: r.transcript?.substring(0, 5000) || ''
        }));

        // Split into connected and not-connected for easy retry
        const connectedResults = finalResults
            .filter(r => r.call_status === 'completed')
            .map(r => ({
                phoneNumber: r.phoneNumber,
                calleeInfo: r.calleeInfo,
                call_id: r.call_id,
                transcript: r.transcript?.substring(0, 5000) || '',
                analytics: r.analytics
            }));

        const notConnectedResults = finalResults
            .filter(r => r.call_status === 'no_answer' || r.call_status === 'failed')
            .map(r => ({
                phoneNumber: r.phoneNumber,
                calleeInfo: r.calleeInfo,
                call_status: r.call_status
            }));

        saveCampaign({
            name: outputFileName || 'Campaign',
            assistantName: selectedAssistant?.name || 'Unknown',
            fromNumber: selectedTrunk === 'twilio' ? 'Twilio' : 'Vobiz',
            totalContacts: contacts.length,
            completed: finalResults.filter(r => r.call_status === 'completed').length,
            noAnswer: finalResults.filter(r => r.call_status === 'no_answer').length,
            failed: finalResults.filter(r => r.call_status === 'failed').length,
            results: storageResults,
            connectedResults,
            notConnectedResults,
        });

        setCampaignStatus('completed');
        setFetchProgress('');
        toast.success('Campaign Completed!');
    };

    const stopCampaign = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Also reset any 'calling' results to 'pending'
        setResults(prev => prev.map(r => ({
            ...r,
            call_status: r.call_status === 'calling' ? 'pending' : r.call_status
        })));
        setCampaignStatus('idle');
        toast.info('Campaign stopped.');
    };

    const resetCampaign = () => {
        setContacts([]);
        setResults([]);
        setCampaignStatus('idle');
        setProgress(0);
        // Clean session storage
        if (userUid) sessionStorage.removeItem(`campaign_state_${userUid}`);
    };

    return (
        <CampaignContext.Provider value={{
            contacts, results, campaignStatus, progress, currentCallIndex, fetchProgress,
            outputFileName, selectedAssistantId, selectedTrunk,
            setContacts, setResults, setOutputFileName, setSelectedAssistantId, setSelectedTrunk,
            startCampaign, stopCampaign, resetCampaign
        }}>
            {children}
        </CampaignContext.Provider>
    );
}

export function useCampaign() {
    const context = useContext(CampaignContext);
    if (!context) throw new Error('useCampaign must be used within CampaignProvider');
    return context;
}
