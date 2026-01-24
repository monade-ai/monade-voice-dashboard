'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Play, Download, FileSpreadsheet, X, Users, Phone, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useTrunks } from '@/app/hooks/use-trunks';
import { useCampaignHistory } from '@/app/hooks/use-campaign-history';
import { useMonadeUser } from '@/app/hooks/use-monade-user';

// Trunk options for campaigns
const TRUNK_OPTIONS = [
    { value: 'vobiz', label: 'Vobiz', description: 'Indian calls' },
    { value: 'twilio', label: 'Twilio', description: 'International calls' },
];

// Dynamic Contact - stores all CSV columns
interface Contact {
    phoneNumber: string;  // The detected phone number
    calleeInfo: Record<string, string>;  // All other columns for personalization
}

interface CampaignResult {
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
    analyticsLoaded?: boolean;  // Track if analytics have been fetched
}

type CampaignStatus = 'idle' | 'ready' | 'running' | 'fetching_results' | 'fetching_analytics' | 'completed' | 'error';

// Phone number column detection patterns (case-insensitive)
const PHONE_COLUMN_PATTERNS = [
    'phone', 'phonenumber', 'phone_number', 'phone number',
    'number', 'mobile', 'mobilenumber', 'mobile_number', 'mobile number',
    'tel', 'telephone', 'cell', 'cellphone', 'contact', 'contact_number'
];

export default function AICampaignsPage() {
    // State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [results, setResults] = useState<CampaignResult[]>([]);
    const [outputFileName, setOutputFileName] = useState('campaign_results');
    const [selectedAssistantId, setSelectedAssistantId] = useState('');
    const [selectedTrunk, setSelectedTrunk] = useState('vobiz'); // Default to Vobiz
    const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [currentCallIndex, setCurrentCallIndex] = useState(0);
    const [fetchProgress, setFetchProgress] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hooks
    const { assistants } = useAssistants();
    const { phoneNumbers, loading: trunksLoading } = useTrunks();
    const { saveCampaign } = useCampaignHistory();
    const { apiKey, userUid, loading: userLoading } = useMonadeUser();

    // Get selected assistant name
    const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);

    // Restore campaign state from sessionStorage on mount
    useEffect(() => {
        if (!userUid) return;

        const storageKey = `campaign_state_${userUid}`;
        const savedState = sessionStorage.getItem(storageKey);

        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                console.log('[Campaign] Restoring state from sessionStorage:', state);

                setContacts(state.contacts || []);
                setResults(state.results || []);
                setOutputFileName(state.outputFileName || 'campaign_results');
                setSelectedAssistantId(state.selectedAssistantId || '');
                setSelectedTrunk(state.selectedTrunk || 'vobiz');
                setCampaignStatus(state.campaignStatus || 'idle');
                setProgress(state.progress || 0);
                setCurrentCallIndex(state.currentCallIndex || 0);
                setFetchProgress(state.fetchProgress || '');
            } catch (err) {
                console.error('[Campaign] Failed to restore state:', err);
            }
        }
    }, [userUid]);

    // Save campaign state to sessionStorage whenever it changes
    useEffect(() => {
        if (!userUid) return;

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

        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [userUid, contacts, results, outputFileName, selectedAssistantId, selectedTrunk, campaignStatus, progress, currentCallIndex, fetchProgress]);

    // Parse CSV file - Dynamic columns with smart phone detection
    const parseCSV = (text: string): Contact[] => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        // Parse header (preserve original case for display, lowercase for matching)
        const rawHeaders = lines[0].split(',').map(h => h.trim());
        const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

        // Find phone column using patterns
        let phoneIndex = -1;
        for (const pattern of PHONE_COLUMN_PATTERNS) {
            const normalizedPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
            phoneIndex = headers.findIndex(h => h === normalizedPattern || h.includes(normalizedPattern));
            if (phoneIndex !== -1) break;
        }

        if (phoneIndex === -1) {
            toast.error('CSV must have a phone number column (e.g., "phone", "number", "mobile")');
            return [];
        }

        console.log(`[CSV Parse] Detected phone column: "${rawHeaders[phoneIndex]}" at index ${phoneIndex}`);
        console.log(`[CSV Parse] All columns: ${rawHeaders.join(', ')}`);

        // Parse rows - store all columns as calleeInfo
        const contacts: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
            // Handle CSV with quoted values
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

            const phoneNumber = values[phoneIndex];
            if (!phoneNumber) continue;

            // Build calleeInfo from all columns (except phone)
            const calleeInfo: Record<string, string> = {};
            for (let j = 0; j < rawHeaders.length; j++) {
                if (j !== phoneIndex && values[j]) {
                    calleeInfo[rawHeaders[j]] = values[j];
                }
            }

            contacts.push({ phoneNumber, calleeInfo });
        }

        console.log(`[CSV Parse] Parsed ${contacts.length} contacts with ${rawHeaders.length - 1} info columns`);
        return contacts;
    };

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed.length > 0) {
                setContacts(parsed);
                setResults([]);
                setCampaignStatus('ready');
                toast.success(`Loaded ${parsed.length} contacts`);
            }
        };
        reader.readAsText(file);
    };

    // Handle drag and drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                const parsed = parseCSV(text);
                if (parsed.length > 0) {
                    setContacts(parsed);
                    setResults([]);
                    setCampaignStatus('ready');
                    toast.success(`Loaded ${parsed.length} contacts`);
                }
            };
            reader.readAsText(file);
        } else {
            toast.error('Please drop a CSV file');
        }
    }, []);

    // Format phone number
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

    // Make a single call - uses dynamic calleeInfo
    const makeCall = async (contact: Contact): Promise<CampaignResult> => {
        const phone = formatPhoneNumber(contact.phoneNumber);

        // Validate API key
        if (!apiKey) {
            console.error('[Campaign] No API key available for billing');
            return {
                phoneNumber: contact.phoneNumber,
                calleeInfo: contact.calleeInfo,
                call_id: '',
                call_status: 'failed',
                transcript: 'Error: No API key configured for billing',
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
                    callee_info: contact.calleeInfo  // Pass ALL dynamic columns for personalization
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

    // Fetch transcript for a call
    const fetchTranscriptForCall = async (phone: string, startTime: Date): Promise<string> => {
        const formattedPhone = formatPhoneNumber(phone);

        // Subtract 30 seconds to account for timing differences
        const bufferTime = new Date(startTime.getTime() - 30000);
        console.log(`[Transcript] Looking for phone: ${formattedPhone}, after: ${bufferTime.toISOString()}`);

        // Poll for transcript (max 30 attempts, 5s each = 2.5 min)
        for (let attempt = 0; attempt < 30; attempt++) {
            try {
                const response = await fetch(`/api/proxy/api/users/${userUid}/transcripts`);
                if (response.ok) {
                    const data = await response.json();
                    const transcripts = Array.isArray(data) ? data : data.transcripts || [];

                    console.log(`[Transcript] Attempt ${attempt + 1}: Found ${transcripts.length} transcripts`);

                    // Find transcript matching phone number created after start time
                    for (const t of transcripts) {
                        const transcriptPhone = t.phone_number || '';
                        const transcriptCreatedAt = t.created_at || '';

                        // Check if phone matches
                        if (transcriptPhone === formattedPhone) {
                            // Parse the created_at timestamp (comes as ISO string with Z suffix)
                            const transcriptTime = new Date(transcriptCreatedAt);

                            console.log(`[Transcript] Found match candidate: ${transcriptPhone}, created: ${transcriptCreatedAt}`);

                            if (transcriptTime > bufferTime) {
                                console.log(`[Transcript] Match confirmed! Fetching content via proxy...`);
                                // Fetch transcript content via proxy to avoid CORS
                                const contentResponse = await fetch('/api/transcript-content', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ url: t.transcript_url })
                                });

                                if (contentResponse.ok) {
                                    const data = await contentResponse.json();
                                    if (data.transcript) {
                                        console.log(`[Transcript] Got transcript: ${data.transcript.substring(0, 100)}...`);
                                        return data.transcript;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`[Transcript] Error on attempt ${attempt + 1}:`, error);
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log(`[Transcript] Not found after 30 attempts for ${formattedPhone}`);
        return '';
    };

    // Start campaign with concurrent call pool (max 10 active calls)
    const startCampaign = async () => {
        if (!selectedAssistantId) {
            toast.error('Please select an assistant');
            return;
        }
        if (!selectedTrunk) {
            toast.error('Please select a trunk provider (Twilio or Vobiz)');
            return;
        }
        if (!apiKey) {
            toast.error('No API key configured. Please contact admin.');
            return;
        }
        if (!userUid) {
            toast.error('User not authenticated. Please log in again.');
            return;
        }
        if (contacts.length === 0) {
            toast.error('No contacts to call');
            return;
        }

        // Track campaign start time for transcript filtering
        const campaignStartTime = new Date();

        setCampaignStatus('running');
        setProgress(0);
        setCurrentCallIndex(0);

        // Initialize results with new dynamic Contact structure
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

        // Shared state for concurrent call pool
        let nextContactIndex = 0;
        let completedCount = 0;
        const allCallResults: CampaignResult[] = [...newResults];
        const callStartTimes: Map<number, Date> = new Map();

        // Worker function that processes one contact at a time
        const processNextContact = async (): Promise<void> => {
            while (nextContactIndex < totalContacts) {
                // Atomically get the next contact index
                const currentIndex = nextContactIndex;
                nextContactIndex++;

                if (currentIndex >= totalContacts) break;

                const contact = contacts[currentIndex];
                const startTime = new Date();
                callStartTimes.set(currentIndex, startTime);

                setCurrentCallIndex(currentIndex);

                // Update status to calling
                setResults(prev => {
                    const updated = [...prev];
                    updated[currentIndex] = { ...updated[currentIndex], call_status: 'calling' };
                    return updated;
                });

                const result = await makeCall(contact);

                // Fetch transcript immediately after call completes
                if (result.call_status === 'completed') {
                    result.transcript = await fetchTranscriptForCall(contact.phoneNumber, startTime);
                    if (!result.transcript) {
                        result.call_status = 'no_answer';
                    }
                }

                // Update result in state and local array
                allCallResults[currentIndex] = result;
                completedCount++;

                setResults(prev => {
                    const updated = [...prev];
                    updated[currentIndex] = result;
                    return updated;
                });

                // Update progress
                setProgress(Math.min(100, Math.round((completedCount / totalContacts) * 100)));
            }
        };

        // Start the concurrent call pool - spawn MAX_CONCURRENT_CALLS workers
        const workers = Array(Math.min(MAX_CONCURRENT_CALLS, totalContacts))
            .fill(null)
            .map(() => processNextContact());

        // Wait for all workers to complete
        await Promise.all(workers);

        // Switch to fetching results state
        setCampaignStatus('fetching_results');
        setFetchProgress('Waiting for transcripts to be processed...');
        toast.info('Calls completed! Now fetching transcripts and analytics...');

        // Wait 30 seconds for backend to process transcripts
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Now fetch transcripts and analytics with retries
        // Match by PHONE NUMBER since call initiation returns different ID than session ID
        const finalResults: CampaignResult[] = [...allCallResults];
        let fetchedCount = 0;
        const totalToFetch = finalResults.length;

        // Helper to normalize phone numbers for comparison (strips to digits only)
        const normalizePhone = (phone: string): string => {
            const digits = phone.replace(/\D/g, '');
            // Return last 10 digits for comparison (handles +91 prefix)
            return digits.slice(-10);
        };

        console.log('[Campaign] Starting analytics fetch. Total calls:', totalToFetch);

        for (let idx = 0; idx < finalResults.length; idx++) {
            const result = finalResults[idx];
            fetchedCount++;
            setFetchProgress(`Fetching results: ${fetchedCount}/${totalToFetch}`);

            // Skip if already failed
            if (result.call_status === 'failed') {
                finalResults[idx] = { ...result, analyticsLoaded: true };
                continue;
            }

            const targetPhoneNormalized = normalizePhone(result.phoneNumber);
            let transcript = result.transcript;
            let analytics = null;
            let realCallId = result.call_id; // May be overwritten by transcript's call_id

            // Fetch transcript by matching phone number
            for (let retry = 0; retry < 5; retry++) {
                try {
                    const transcriptsResponse = await fetch(`/api/proxy/api/users/${userUid}/transcripts`);
                    if (transcriptsResponse.ok) {
                        const transcriptsData = await transcriptsResponse.json();
                        const transcripts = Array.isArray(transcriptsData) ? transcriptsData : transcriptsData.transcripts || [];

                        console.log(`[Campaign] Checking ${transcripts.length} transcripts for phone ${targetPhoneNormalized}`);

                        // Find transcript matching phone number AND created after campaign started
                        // Filter by timestamp to get only transcripts from THIS campaign run
                        const campaignStartBuffer = new Date(campaignStartTime.getTime() - 60000); // 1 min buffer

                        const matchingTranscript = transcripts.find((t: any) => {
                            const transcriptPhone = normalizePhone(t.phone_number || '');
                            const transcriptTime = new Date(t.created_at || 0);
                            // Must match phone AND be created after campaign start
                            return transcriptPhone === targetPhoneNormalized && transcriptTime > campaignStartBuffer;
                        });

                        if (matchingTranscript) {
                            console.log(`[Campaign] Found transcript match:`, matchingTranscript.call_id);
                            realCallId = matchingTranscript.call_id; // Use the REAL call ID from transcript

                            // Fetch transcript content
                            if (matchingTranscript.transcript_url) {
                                const contentResponse = await fetch('/api/transcript-content', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ url: matchingTranscript.transcript_url })
                                });
                                if (contentResponse.ok) {
                                    const data = await contentResponse.json();
                                    transcript = data.transcript || '';
                                    console.log(`[Campaign] Got transcript: ${transcript.substring(0, 50)}...`);
                                }
                            }
                            break;
                        }
                    }
                } catch (err) {
                    console.error('Transcript fetch failed:', err);
                }
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Fetch analytics using the REAL call_id from transcript
            if (realCallId) {
                for (let retry = 0; retry < 3; retry++) {
                    try {
                        const analyticsResponse = await fetch(`/api/proxy/api/analytics/${realCallId}`);
                        if (analyticsResponse.ok) {
                            const data = await analyticsResponse.json();
                            analytics = data.analytics || data;
                            console.log(`[Campaign] Got analytics for ${realCallId}:`, analytics?.verdict);
                            break;
                        }
                    } catch (err) {
                        console.error('Analytics fetch failed:', err);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Update finalResults array with analyticsLoaded flag
            const finalStatus = transcript ? 'completed' : (result.call_status === 'completed' ? 'no_answer' : result.call_status);
            finalResults[idx] = {
                ...result,
                call_id: realCallId, // Update with real call_id from transcript
                transcript: transcript || '',
                analytics,
                call_status: finalStatus as any,
                analyticsLoaded: true
            };

            // Update UI state
            setResults(prev => {
                const updated = [...prev];
                updated[idx] = finalResults[idx];
                return updated;
            });
        }

        // Mark remaining non-completed calls as analyticsLoaded (nothing to fetch)
        for (let i = 0; i < finalResults.length; i++) {
            if (!finalResults[i].analyticsLoaded) {
                finalResults[i] = { ...finalResults[i], analyticsLoaded: true };
            }
        }

        // Save campaign to history using collected finalResults
        console.log('[Campaign] Saving to history:', {
            totalContacts: contacts.length,
            completed: finalResults.filter(r => r.call_status === 'completed').length,
            noAnswer: finalResults.filter(r => r.call_status === 'no_answer').length,
            failed: finalResults.filter(r => r.call_status === 'failed').length,
            resultsCount: finalResults.length,
            sampleResult: finalResults[0]
        });

        // Truncate transcripts to avoid localStorage size limits
        const resultsForStorage = finalResults.map(r => ({
            phoneNumber: r.phoneNumber,
            calleeInfo: r.calleeInfo,
            call_id: r.call_id,
            call_status: r.call_status,
            transcript: r.transcript?.substring(0, 5000) || '',
            analytics: r.analytics,
            analyticsLoaded: r.analyticsLoaded
        }));

        saveCampaign({
            name: outputFileName || 'Campaign',
            assistantName: selectedAssistant?.name || 'Unknown',
            fromNumber: selectedTrunk === 'twilio' ? 'Twilio' : 'Vobiz',
            totalContacts: contacts.length,
            completed: finalResults.filter(r => r.call_status === 'completed').length,
            noAnswer: finalResults.filter(r => r.call_status === 'no_answer').length,
            failed: finalResults.filter(r => r.call_status === 'failed').length,
            results: resultsForStorage,
        });

        setCampaignStatus('completed');
        setFetchProgress('');
        toast.success('Campaign completed! Results ready for download.');
    };

    // Download results as CSV (dynamic columns from calleeInfo)
    const downloadResults = async () => {
        // Check if all analytics are loaded
        const allAnalyticsLoaded = results.every(r => r.analyticsLoaded);
        if (!allAnalyticsLoaded) {
            toast.warning('Please wait for all analytics to be fetched before downloading.');
            return;
        }

        toast.info('Generating CSV...');

        // Build dynamic headers from calleeInfo keys (from first result)
        const calleeInfoKeys = results.length > 0 ? Object.keys(results[0].calleeInfo) : [];

        const headers = [
            'phone_number',
            ...calleeInfoKeys,
            'call_id',
            'call_status',
            'verdict',
            'confidence_score',
            'summary',
            'call_quality',
            'customer_name',
            'customer_location',
            'price_quoted',
            'transcript'
        ];

        // Escape function for CSV values
        const escapeCSV = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            // If contains comma, newline, or quotes, wrap in quotes and escape quotes
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = results.map(r => {
            const analytics = r.analytics;
            const discoveries = analytics?.key_discoveries || {};

            return [
                escapeCSV(r.phoneNumber),
                ...calleeInfoKeys.map(key => escapeCSV(r.calleeInfo[key] || '')),
                escapeCSV(r.call_id),
                escapeCSV(r.call_status),
                escapeCSV(analytics?.verdict || ''),
                escapeCSV(analytics?.confidence_score || ''),
                escapeCSV(analytics?.summary || ''),
                escapeCSV(analytics?.call_quality || ''),
                escapeCSV(discoveries.customer_name || ''),
                escapeCSV(discoveries.customer_location || ''),
                escapeCSV(discoveries.price_quoted || ''),
                escapeCSV(r.transcript)
            ].join(',');
        });

        // Add BOM for proper Unicode/Hindi text encoding in Excel
        const BOM = '\uFEFF';
        const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${outputFileName || 'campaign_results'}.csv`;
        a.click();

        URL.revokeObjectURL(url);
        toast.success('CSV downloaded!');
    };

    // Clear campaign
    const clearCampaign = () => {
        setContacts([]);
        setResults([]);
        setCampaignStatus('idle');
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Clear sessionStorage
        if (userUid) {
            sessionStorage.removeItem(`campaign_state_${userUid}`);
        }
    };

    // Get status icon
    const getStatusIcon = (status: CampaignResult['call_status']) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
            case 'calling': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'no_answer': return <XCircle className="w-4 h-4 text-yellow-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">AI Campaign</h1>
                <p className="text-gray-600">Upload a CSV, run bulk AI calls, and download results with transcripts</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Upload & Config */}
                <div className="lg:col-span-1 space-y-4">
                    {/* CSV Upload */}
                    <Card className="p-4">
                        <Label className="text-sm font-medium mb-2 block">Upload Contacts CSV</Label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${campaignStatus === 'idle' ? 'border-gray-300 hover:border-amber-400' : 'border-gray-200 bg-gray-50'
                                }`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={campaignStatus === 'running'}
                            />
                            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 mb-2">
                                Drag & drop CSV or{' '}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-amber-600 hover:underline"
                                    disabled={campaignStatus === 'running'}
                                >
                                    browse
                                </button>
                            </p>
                            <p className="text-xs text-gray-400">Auto-detects phone column (phone, mobile, number, etc.)</p>
                        </div>

                        {contacts.length > 0 && (
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="flex items-center text-green-600">
                                    <Users className="w-4 h-4 mr-1" />
                                    {contacts.length} contacts loaded
                                </span>
                                <button onClick={clearCampaign} className="text-gray-500 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* Configuration */}
                    <Card className="p-4 space-y-4">
                        <div>
                            <Label>Campaign Name</Label>
                            <Input
                                value={outputFileName}
                                onChange={(e) => setOutputFileName(e.target.value)}
                                placeholder="My Campaign"
                                className="mt-1"
                            />
                            <p className="text-xs text-gray-400 mt-1">Saved in history &amp; used for CSV filename</p>
                        </div>

                        <div>
                            <Label>Select Assistant</Label>
                            <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Choose an assistant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assistants.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Call Provider</Label>
                            <Select value={selectedTrunk} onValueChange={setSelectedTrunk}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select trunk provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TRUNK_OPTIONS.map((trunk) => (
                                        <SelectItem key={trunk.value} value={trunk.value}>
                                            {trunk.label} ({trunk.description})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-1">Select Vobiz for Indian calls, Twilio for international.</p>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 space-y-2">
                            {campaignStatus !== 'running' && campaignStatus !== 'fetching_results' && campaignStatus !== 'completed' && (
                                <Button
                                    onClick={startCampaign}
                                    disabled={contacts.length === 0 || !selectedAssistantId || !selectedTrunk || !apiKey}
                                    className="w-full bg-amber-500 hover:bg-amber-600"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Campaign ({contacts.length} calls)
                                </Button>
                            )}

                            {campaignStatus === 'running' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Making calls...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} />
                                    <p className="text-xs text-gray-500 text-center">
                                        Processing call {currentCallIndex + 1} of {contacts.length}...
                                    </p>
                                </div>
                            )}

                            {campaignStatus === 'fetching_results' && (
                                <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 text-blue-700">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="font-medium">Fetching Results...</span>
                                    </div>
                                    <p className="text-xs text-blue-600">
                                        {fetchProgress || 'Processing transcripts and analytics...'}
                                    </p>
                                    <p className="text-xs text-blue-500">
                                        Please wait, this ensures accurate data in your CSV.
                                    </p>
                                </div>
                            )}

                            {campaignStatus === 'completed' && (
                                <Button onClick={downloadResults} className="w-full bg-green-500 hover:bg-green-600">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download {outputFileName}.csv
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column - Preview/Results */}
                <div className="lg:col-span-2">
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">
                                {results.length > 0 ? 'Campaign Results' : 'Contacts Preview'}
                            </h3>
                            {results.length > 0 && (
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center text-green-600">
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        {results.filter(r => r.call_status === 'completed').length} completed
                                    </span>
                                    <span className="flex items-center text-yellow-600">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {results.filter(r => r.call_status === 'no_answer').length} no answer
                                    </span>
                                    <span className="flex items-center text-red-600">
                                        <XCircle className="w-4 h-4 mr-1" />
                                        {results.filter(r => r.call_status === 'failed').length} failed
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead>Info</TableHead>
                                        {results.length > 0 && (
                                            <>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Call ID</TableHead>
                                                <TableHead>Transcript</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(results.length > 0 ? results : contacts.map(c => ({ ...c, call_id: '', call_status: 'pending' as const, transcript: '', analyticsLoaded: false }))).slice(0, 50).map((row, i) => {
                                        // Get first 2 calleeInfo fields for display
                                        const infoKeys = Object.keys(row.calleeInfo).slice(0, 2);
                                        const infoDisplay = infoKeys.map(k => `${k}: ${row.calleeInfo[k]}`).join(', ') || '-';

                                        return (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{row.phoneNumber}</TableCell>
                                                <TableCell className="text-sm text-gray-600 max-w-xs truncate">{infoDisplay}</TableCell>
                                                {results.length > 0 && (
                                                    <>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                {getStatusIcon((row as CampaignResult).call_status)}
                                                                <span className="capitalize text-sm">{(row as CampaignResult).call_status}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-gray-500">{(row as CampaignResult).call_id}</TableCell>
                                                        <TableCell className="max-w-xs truncate text-xs text-gray-500">
                                                            {(row as CampaignResult).transcript?.split('\n')[0] || '-'}
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                    {contacts.length === 0 && results.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                                                Upload a CSV file to see contacts here
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {(results.length > 50 || contacts.length > 50) && (
                                <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                                    Showing first 50 of {results.length || contacts.length} contacts
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
