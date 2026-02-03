'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { useCampaignHistory } from '@/app/hooks/use-campaign-history';
import { fetchJson } from '@/lib/http';

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
    sessionKey: string;

    // Actions
    setContacts: (contacts: Contact[]) => void;
    setResults: (results: CampaignResult[]) => void;
    setOutputFileName: (name: string) => void;
    setSelectedAssistantId: (id: string) => void;
    setSelectedTrunk: (trunk: string) => void;
    setSessionKey: (key: string) => void;
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
  const [sessionKey, setSessionKey] = useState('campaigns');
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

  const resetStateForSession = () => {
    setContacts([]);
    setResults([]);
    setOutputFileName('campaign_results');
    setSelectedAssistantId('');
    setSelectedTrunk('vobiz');
    setCampaignStatus('idle');
    setProgress(0);
    setCurrentCallIndex(0);
    setFetchProgress('');
  };

  // RESTORE STATE
  useEffect(() => {
    if (!userUid) return;

    isRestoredRef.current = false;
    const storageKey = `campaign_state_${userUid}_${sessionKey}`;
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
            call_status: r.call_status === 'calling' ? 'pending' : r.call_status,
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
      } else {
        resetStateForSession();
      }
    } catch (err) {
      console.error('[CampaignContext] Restore failed:', err);
      resetStateForSession();
    } finally {
      isRestoredRef.current = true;
    }
  }, [userUid, sessionKey]);

  // SAVE STATE
  useEffect(() => {
    if (!userUid || !isRestoredRef.current) return;

    const storageKey = `campaign_state_${userUid}_${sessionKey}`;
    const state = {
      contacts,
      results,
      outputFileName,
      selectedAssistantId,
      selectedTrunk,
      sessionKey,
      campaignStatus,
      progress,
      currentCallIndex,
      fetchProgress,
    };

    if (contacts.length > 0 || campaignStatus !== 'idle') {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } else if (isRestoredRef.current && contacts.length === 0 && campaignStatus === 'idle') {
      // Sync empty state if restored
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [userUid, sessionKey, contacts, results, outputFileName, selectedAssistantId, selectedTrunk, campaignStatus, progress, currentCallIndex, fetchProgress]);

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
        analyticsLoaded: false,
      };
    }

    try {
      const data = await fetchJson<any>('/api/calling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          assistant_id: selectedAssistantId,
          trunk_name: selectedTrunk,
          api_key: apiKey,
          callee_info: contact.calleeInfo,
        }),
        retry: { retries: 0 },
      });

      return {
        phoneNumber: contact.phoneNumber,
        calleeInfo: contact.calleeInfo,
        call_id: data.call_id || '',
        call_status: 'completed',
        transcript: '',
        analyticsLoaded: false,
      };
    } catch (error) {
      console.error('[Campaign] Call error:', error);

      return {
        phoneNumber: contact.phoneNumber,
        calleeInfo: contact.calleeInfo,
        call_id: '',
        call_status: 'failed',
        transcript: error instanceof Error ? error.message : 'Unknown error',
        analyticsLoaded: false,
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
        const data = await fetchJson<any>(`/api/proxy/api/users/${userUid}/transcripts`);
        const transcripts = Array.isArray(data) ? data : data.transcripts || [];

        for (const t of transcripts) {
          const transcriptPhone = t.phone_number || '';
          const transcriptTime = new Date(t.created_at || '');

          if (transcriptPhone === formattedPhone && transcriptTime > bufferTime) {
            const contentData = await fetchJson<any>('/api/transcript-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: t.transcript_url }),
              retry: { retries: 2 },
            });
            if (contentData.transcript && contentData.transcript.trim()) {
              return contentData.transcript;
            }
          }
        }
      } catch (err) {
        console.error('Transcript check failed:', err);
      }

      return null;
    };

    // PHASE 1: Quick check (15s) - transcripts should already be ready since we use fixed delay
    // 3 attempts × 5 seconds = 15 seconds
    console.log(`[Campaign] Phase 1: Quick transcript check for ${formattedPhone}`);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (abortControllerRef.current?.signal.aborted) break;

      const transcript = await checkForTranscript();
      if (transcript) {
        console.log(`[Campaign] Transcript found in Phase 1 for ${formattedPhone}`);

        return transcript;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // PHASE 2: Brief extended check (10s) - final attempt
    // 2 attempts × 5 seconds = 10 seconds
    console.log(`[Campaign] Phase 2: Brief extended check for ${formattedPhone}`);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (abortControllerRef.current?.signal.aborted) break;

      const transcript = await checkForTranscript();
      if (transcript) {
        console.log(`[Campaign] Transcript found in Phase 2 for ${formattedPhone}`);

        return transcript;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // No transcript after ~25 seconds - mark as no conversation
    console.log(`[Campaign] No transcript found for ${formattedPhone} after 25s`);

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
      analyticsLoaded: false,
    }));
    setResults(newResults);

    const totalContacts = contacts.length;
    // Use 5 concurrent workers (50% of Vobiz's 10 limit for safety)
    const MAX_CONCURRENT_CALLS = 5;
    // Fixed delay per call slot (90 seconds) - allows call to complete + transcript to generate
    const CALL_SLOT_DURATION_MS = 90_000;
    let nextContactIndex = 0;
    let completedCount = 0;

    // This array will hold call metadata for bulk transcript fetching at end
    const processingResults = [...newResults];
    const callMetadata: Array<{ index: number; phoneNumber: string; startTime: Date }> = [];

    // Worker function - Fire-and-Forget approach
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

        // Store metadata for bulk transcript fetch later (don't wait for transcript now)
        if (result.call_status === 'completed') {
          callMetadata.push({ index: currentIndex, phoneNumber: contact.phoneNumber, startTime });
        }

        processingResults[currentIndex] = result;
        completedCount++;

        setResults(prev => {
          const updated = [...prev];
          // Mark as 'completed' for now - will update to 'no_answer' if no transcript found later
          updated[currentIndex] = { ...result, call_status: result.call_status === 'completed' ? 'completed' : result.call_status };

          return updated;
        });

        setProgress(Math.round((completedCount / totalContacts) * 100));

        // Fixed delay before picking up next contact (gives call time to complete)
        // This ensures we don't exceed concurrency limit even if calls run long
        if (nextContactIndex < totalContacts) {
          await new Promise(resolve => setTimeout(resolve, CALL_SLOT_DURATION_MS));
        }
      }
    };

    const workers = Array(Math.min(MAX_CONCURRENT_CALLS, totalContacts))
      .fill(null)
      .map(() => processNextContact());

    await Promise.all(workers);

    // PHASE 2: Bulk transcript fetching for all completed calls
    if (!abortControllerRef.current?.signal.aborted && callMetadata.length > 0) {
      setCampaignStatus('fetching_results');
      setFetchProgress('Waiting for calls to complete...');

      // Wait until at least 90s has passed since the MOST RECENT call was made
      // This ensures even the last call has time to complete before we fetch transcripts
      const MINIMUM_CALL_DURATION_MS = 90_000;
      const mostRecentCallTime = callMetadata.reduce((latest, meta) =>
        meta.startTime > latest ? meta.startTime : latest,
      callMetadata[0].startTime,
      );
      const elapsedSinceMostRecentCall = Date.now() - mostRecentCallTime.getTime();
      const remainingWait = Math.max(0, MINIMUM_CALL_DURATION_MS - elapsedSinceMostRecentCall);

      if (remainingWait > 0) {
        console.log(`[Campaign] Waiting ${Math.round(remainingWait / 1000)}s for most recent call to complete...`);
        setFetchProgress(`Waiting ${Math.round(remainingWait / 1000)}s for calls to complete...`);
        await new Promise(resolve => setTimeout(resolve, remainingWait));
      }

      setFetchProgress(`Fetching transcripts for ${callMetadata.length} calls...`);

      // Worker pool for parallel transcript fetching (5 concurrent)
      const TRANSCRIPT_WORKERS = 5;
      let transcriptNextIndex = 0;
      let transcriptCompleted = 0;

      const transcriptWorker = async () => {
        while (transcriptNextIndex < callMetadata.length) {
          if (abortControllerRef.current?.signal.aborted) break;

          const currentIdx = transcriptNextIndex++;
          if (currentIdx >= callMetadata.length) break;

          const meta = callMetadata[currentIdx];
          const transcript = await fetchTranscriptForCall(meta.phoneNumber, meta.startTime);

          if (transcript) {
            processingResults[meta.index].transcript = transcript;
          } else {
            processingResults[meta.index].call_status = 'no_answer';
            processingResults[meta.index].transcript = '';
          }

          transcriptCompleted++;
          setFetchProgress(`Fetching transcripts: ${transcriptCompleted}/${callMetadata.length}`);
          setResults([...processingResults]);
        }
      };

      // Start 5 transcript workers
      const transcriptWorkers = Array(Math.min(TRANSCRIPT_WORKERS, callMetadata.length))
        .fill(null)
        .map(() => transcriptWorker());
      await Promise.all(transcriptWorkers);
    }

    if (abortControllerRef.current?.signal.aborted) {
      setCampaignStatus('idle');

      return;
    }

    // Fetching Analytics Phase with Worker Pool
    setCampaignStatus('fetching_analytics');
    toast.info('Fetching analytics...');

    const finalResults = [...processingResults];
    const normalizePhone = (p: string) => p.replace(/\D/g, '').slice(-10);
    const campaignStartBuffer = new Date(campaignStartTime.getTime() - 60000);

    // Get results that need analytics (completed calls with transcripts)
    const analyticsQueue = finalResults
      .map((res, idx) => ({ res, idx }))
      .filter(item => item.res.call_status === 'completed' && item.res.transcript);

    if (analyticsQueue.length > 0) {
      const ANALYTICS_WORKERS = 5;
      let analyticsNextIndex = 0;
      let analyticsCompleted = 0;

      const analyticsWorker = async () => {
        while (analyticsNextIndex < analyticsQueue.length) {
          if (abortControllerRef.current?.signal.aborted) break;

          const currentIdx = analyticsNextIndex++;
          if (currentIdx >= analyticsQueue.length) break;

          const { res, idx } = analyticsQueue[currentIdx];
          const targetPhoneNormalized = normalizePhone(res.phoneNumber);
          let realCallId = '';

          // Find call_id from transcript
          try {
            const transcriptsData = await fetchJson<any>(`/api/proxy/api/users/${userUid}/transcripts`);
            const transcripts = Array.isArray(transcriptsData) ? transcriptsData : transcriptsData.transcripts || [];
            const match = transcripts.find((t: any) => {
              const tPhone = normalizePhone(t.phone_number || '');
              const tTime = new Date(t.created_at || 0);

              return tPhone === targetPhoneNormalized && tTime > campaignStartBuffer;
            });
            if (match) realCallId = match.call_id;
          } catch (err) {
            console.error('Transcript lookup failed:', err);
          }

          // Fetch analytics
          if (realCallId) {
            finalResults[idx].call_id = realCallId;
            try {
              const d = await fetchJson<any>(`/api/proxy/api/analytics/${realCallId}`);
              finalResults[idx].analytics = d.analytics || d;
            } catch (e) {
              console.error('Analytics fetch failed:', e);
            }
          }

          finalResults[idx].analyticsLoaded = true;
          analyticsCompleted++;
          setFetchProgress(`Fetching analytics: ${analyticsCompleted}/${analyticsQueue.length}`);
          setResults([...finalResults]);
        }
      };

      const analyticsWorkers = Array(Math.min(ANALYTICS_WORKERS, analyticsQueue.length))
        .fill(null)
        .map(() => analyticsWorker());
      await Promise.all(analyticsWorkers);
    }

    // Mark any remaining as loaded
    for (let i = 0; i < finalResults.length; i++) {
      if (!finalResults[i].analyticsLoaded) {
        finalResults[i].analyticsLoaded = true;
      }
    }
    setResults([...finalResults]);

    // SAVE HISTORY
    // Truncate transcripts for storage
    const storageResults = finalResults.map(r => ({
      ...r,
      transcript: r.transcript?.substring(0, 5000) || '',
    }));

    // Split into connected and not-connected for easy retry
    const connectedResults = finalResults
      .filter(r => r.call_status === 'completed')
      .map(r => ({
        phoneNumber: r.phoneNumber,
        calleeInfo: r.calleeInfo,
        call_id: r.call_id,
        transcript: r.transcript?.substring(0, 5000) || '',
        analytics: r.analytics,
      }));

    const notConnectedResults = finalResults
      .filter(r => r.call_status === 'no_answer' || r.call_status === 'failed')
      .map(r => ({
        phoneNumber: r.phoneNumber,
        calleeInfo: r.calleeInfo,
        call_status: r.call_status,
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
      call_status: r.call_status === 'calling' ? 'pending' : r.call_status,
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
    if (userUid) sessionStorage.removeItem(`campaign_state_${userUid}_${sessionKey}`);
  };

  return (
    <CampaignContext.Provider value={{
      contacts, results, campaignStatus, progress, currentCallIndex, fetchProgress,
      outputFileName, selectedAssistantId, selectedTrunk, sessionKey,
      setContacts, setResults, setOutputFileName, setSelectedAssistantId, setSelectedTrunk, setSessionKey,
      startCampaign, stopCampaign, resetCampaign,
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
