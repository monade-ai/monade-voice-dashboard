'use client';

import React, { useState, useCallback, useRef } from 'react';
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

interface Contact {
    name: string;
    number: string;
}

interface CampaignResult {
    name: string;
    number: string;
    call_id: string;
    call_status: 'pending' | 'calling' | 'completed' | 'no_answer' | 'failed';
    transcript: string;
}

type CampaignStatus = 'idle' | 'ready' | 'running' | 'completed' | 'error';

export default function AICampaignsPage() {
    // State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [results, setResults] = useState<CampaignResult[]>([]);
    const [outputFileName, setOutputFileName] = useState('campaign_results');
    const [selectedAssistantId, setSelectedAssistantId] = useState('');
    const [selectedFromNumber, setSelectedFromNumber] = useState('');
    const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [currentCallIndex, setCurrentCallIndex] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hooks
    const { assistants } = useAssistants();
    const { phoneNumbers, loading: trunksLoading } = useTrunks();

    // Get selected assistant name
    const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);

    // Parse CSV file
    const parseCSV = (text: string): Contact[] => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        // Parse header (case-insensitive)
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIndex = headers.findIndex(h => h === 'name');
        const numberIndex = headers.findIndex(h => h === 'number' || h === 'phone' || h === 'phonenumber' || h === 'phone_number');

        if (nameIndex === -1 || numberIndex === -1) {
            toast.error('CSV must have "name" and "number" columns');
            return [];
        }

        // Parse rows
        const contacts: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            if (values.length > Math.max(nameIndex, numberIndex)) {
                const name = values[nameIndex];
                const number = values[numberIndex];
                if (name && number) {
                    contacts.push({ name, number });
                }
            }
        }

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

    // Make a single call
    const makeCall = async (contact: Contact): Promise<CampaignResult> => {
        const phone = formatPhoneNumber(contact.number);

        try {
            const response = await fetch('/api/calling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: phone,
                    assistant_id: selectedAssistantId,
                    assistant_name: selectedAssistant?.name || 'Campaign Assistant',
                    from_number: selectedFromNumber,
                    callee_info: { name: contact.name }
                })
            });

            if (!response.ok) {
                throw new Error('Call failed');
            }

            const data = await response.json();
            return {
                name: contact.name,
                number: contact.number,
                call_id: data.call_id || '',
                call_status: 'completed',
                transcript: '' // Will be fetched later
            };
        } catch (error) {
            return {
                name: contact.name,
                number: contact.number,
                call_id: '',
                call_status: 'failed',
                transcript: ''
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
                const response = await fetch(`/api/proxy/api/users/b08d1d4d-a47d-414b-9360-80264388793f/transcripts`);
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

    // Start campaign
    const startCampaign = async () => {
        if (!selectedAssistantId) {
            toast.error('Please select an assistant');
            return;
        }
        if (!selectedFromNumber) {
            toast.error('Please select a from number');
            return;
        }
        if (contacts.length === 0) {
            toast.error('No contacts to call');
            return;
        }

        setCampaignStatus('running');
        setProgress(0);
        setCurrentCallIndex(0);

        const newResults: CampaignResult[] = contacts.map(c => ({
            name: c.name,
            number: c.number,
            call_id: '',
            call_status: 'pending',
            transcript: ''
        }));
        setResults(newResults);

        // Process calls in batches of 10 (concurrent)
        const batchSize = 10;
        const totalContacts = contacts.length;

        for (let i = 0; i < totalContacts; i += batchSize) {
            const batch = contacts.slice(i, Math.min(i + batchSize, totalContacts));
            const startTime = new Date();

            // Initiate all calls in batch
            const callPromises = batch.map(async (contact, batchIndex) => {
                const globalIndex = i + batchIndex;
                setCurrentCallIndex(globalIndex);

                // Update status to calling
                setResults(prev => {
                    const updated = [...prev];
                    updated[globalIndex] = { ...updated[globalIndex], call_status: 'calling' };
                    return updated;
                });

                const result = await makeCall(contact);

                // Fetch transcript
                if (result.call_status === 'completed') {
                    result.transcript = await fetchTranscriptForCall(contact.number, startTime);
                    if (!result.transcript) {
                        result.call_status = 'no_answer';
                    }
                }

                // Update result
                setResults(prev => {
                    const updated = [...prev];
                    updated[globalIndex] = result;
                    return updated;
                });

                return result;
            });

            await Promise.all(callPromises);
            setProgress(Math.min(100, Math.round(((i + batch.length) / totalContacts) * 100)));
        }

        setCampaignStatus('completed');
        toast.success('Campaign completed!');
    };

    // Download results as CSV
    const downloadResults = async () => {
        toast.info('Preparing CSV with analytics... This may take a moment.');

        // Fetch analytics for all calls
        const resultsWithAnalytics = await Promise.all(
            results.map(async (result) => {
                if (result.call_status !== 'completed' || !result.call_id) {
                    return {
                        ...result,
                        analytics: null
                    };
                }

                try {
                    const response = await fetch(`/api/proxy/api/analytics/${result.call_id}`);
                    if (!response.ok) {
                        return { ...result, analytics: null };
                    }

                    const data = await response.json();
                    const analytics = data.analytics || data;
                    return { ...result, analytics };
                } catch (err) {
                    console.error('Failed to fetch analytics for', result.call_id, err);
                    return { ...result, analytics: null };
                }
            })
        );

        const headers = [
            'name',
            'number',
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

        const rows = resultsWithAnalytics.map(r => {
            const analytics = r.analytics;
            const discoveries = analytics?.key_discoveries || {};

            return [
                r.name,
                r.number,
                r.call_id,
                r.call_status,
                analytics?.verdict || '',
                analytics?.confidence_score || '',
                analytics?.summary ? `"${analytics.summary.replace(/"/g, '""')}"` : '',
                analytics?.call_quality || '',
                discoveries.customer_name || '',
                discoveries.customer_location || '',
                discoveries.price_quoted || '',
                `"${r.transcript.replace(/"/g, '""')}"`
            ];
        });

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${outputFileName || 'campaign_results'}.csv`;
        a.click();

        URL.revokeObjectURL(url);
        toast.success('CSV downloaded with analytics!');
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
                            <p className="text-xs text-gray-400">Must have "name" and "number" columns</p>
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
                            <Label>Output File Name</Label>
                            <Input
                                value={outputFileName}
                                onChange={(e) => setOutputFileName(e.target.value)}
                                placeholder="campaign_results"
                                className="mt-1"
                            />
                            <p className="text-xs text-gray-400 mt-1">.csv will be added automatically</p>
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
                            <Label>From Number</Label>
                            <Select value={selectedFromNumber} onValueChange={setSelectedFromNumber}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder={trunksLoading ? 'Loading...' : 'Select phone number'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {phoneNumbers.map((p) => (
                                        <SelectItem key={p.number} value={p.number}>
                                            {p.number} ({p.trunkName})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 space-y-2">
                            {campaignStatus !== 'running' && campaignStatus !== 'completed' && (
                                <Button
                                    onClick={startCampaign}
                                    disabled={contacts.length === 0 || !selectedAssistantId || !selectedFromNumber}
                                    className="w-full bg-amber-500 hover:bg-amber-600"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Campaign ({contacts.length} calls)
                                </Button>
                            )}

                            {campaignStatus === 'running' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Progress</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} />
                                    <p className="text-xs text-gray-500 text-center">
                                        Processing call {currentCallIndex + 1} of {contacts.length}...
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Number</TableHead>
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
                                    {(results.length > 0 ? results : contacts.map(c => ({ ...c, call_id: '', call_status: 'pending' as const, transcript: '' }))).slice(0, 50).map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{row.name}</TableCell>
                                            <TableCell>{row.number}</TableCell>
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
                                    ))}
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
