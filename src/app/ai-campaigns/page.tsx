'use client';

import React, { useRef, useState, useCallback } from 'react';
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
import { useCampaign, Contact, CampaignResult } from '@/app/contexts/campaign-context';

// Phone number column detection patterns (case-insensitive)
const PHONE_COLUMN_PATTERNS = [
    'phone', 'phonenumber', 'phone_number', 'phone number',
    'number', 'mobile', 'mobilenumber', 'mobile_number', 'mobile number',
    'tel', 'telephone', 'cell', 'cellphone', 'contact', 'contact_number'
];

export default function AICampaignsPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hooks - View Data
    const { assistants } = useAssistants();
    const {
        contacts, results, campaignStatus, progress, currentCallIndex, fetchProgress,
        outputFileName, selectedAssistantId, selectedTrunk,
        setContacts, setResults, setOutputFileName, setSelectedAssistantId, setSelectedTrunk,
        startCampaign, stopCampaign, resetCampaign
    } = useCampaign();

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
                    toast.success(`Loaded ${parsed.length} contacts`);
                }
            };
            reader.readAsText(file);
        } else {
            toast.error('Please drop a CSV file');
        }
    }, [setContacts, setResults]);

    // Download results CSV
    const downloadResults = async () => {
        // Check if all analytics are loaded
        const allAnalyticsLoaded = results.every(r => r.analyticsLoaded);
        if (!allAnalyticsLoaded && campaignStatus !== 'completed') {
            // If completed, we let them download whatever we have
            // But if running/fetching, warn them
            toast.warning('Still fetching analytics. Please wait.');
            return;
        }

        toast.info('Generating CSV...');

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

        const escapeCSV = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
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

        const BOM = '\uFEFF';
        const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${outputFileName || 'campaign_results'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Clear campaign UI
    const handleClear = () => {
        resetCampaign();
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                                disabled={campaignStatus === 'running' || campaignStatus === 'fetching_results'}
                            />
                            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 mb-2">
                                Drag & drop CSV or{' '}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-amber-600 hover:underline"
                                    disabled={campaignStatus === 'running' || campaignStatus === 'fetching_results'}
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
                                <button
                                    onClick={handleClear}
                                    className="text-gray-400 hover:text-red-500"
                                    disabled={campaignStatus === 'running'}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* Campaign Config */}
                    <Card className="p-4 space-y-4">
                        <div>
                            <Label>Campaign Name</Label>
                            <Input
                                value={outputFileName}
                                onChange={(e) => setOutputFileName(e.target.value)}
                                placeholder="Enter campaign name"
                                className="mt-1"
                                disabled={campaignStatus === 'running'}
                            />
                            <p className="text-xs text-gray-500 mt-1">Saved in history & used for CSV filename</p>
                        </div>

                        <div>
                            <Label>Select Assistant</Label>
                            <Select
                                value={selectedAssistantId}
                                onValueChange={setSelectedAssistantId}
                                disabled={campaignStatus === 'running'}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Choose an assistant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assistants.map((assistant) => (
                                        <SelectItem key={assistant.id} value={assistant.id}>
                                            {assistant.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Call Provider</Label>
                            <Select
                                value={selectedTrunk}
                                onValueChange={setSelectedTrunk}
                                disabled={campaignStatus === 'running'}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vobiz">Vobiz (Indian calls)</SelectItem>
                                    <SelectItem value="twilio">Twilio (International calls)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-1">Select Vobiz for Indian calls, Twilio for international.</p>
                        </div>

                        {campaignStatus === 'idle' || campaignStatus === 'ready' || campaignStatus === 'completed' || campaignStatus === 'error' ? (
                            <Button
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={campaignStatus === 'completed' ? resetCampaign : startCampaign}
                                disabled={campaignStatus !== 'completed' && (contacts.length === 0 || !selectedAssistantId)}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                {campaignStatus === 'completed' ? 'Start New Campaign' : `Start Campaign (${contacts.length} calls)`}
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={stopCampaign}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Stop Campaign
                            </Button>
                        )}
                    </Card>
                </div>

                {/* Right Column - Results */}
                <div className="lg:col-span-2">
                    <Card className="h-full min-h-[500px] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h2 className="font-semibold text-gray-800">Campaign Results</h2>

                            <div className="flex space-x-2 text-xs">
                                <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {results.filter(r => r.call_status === 'completed').length} completed
                                </span>
                                <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {results.filter(r => r.call_status === 'no_answer').length} no answer
                                </span>
                                <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {results.filter(r => r.call_status === 'failed').length} failed
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar (only when running) */}
                        {campaignStatus === 'running' && (
                            <div className="p-4 bg-blue-50 border-b border-blue-100">
                                <div className="flex justify-between text-xs text-blue-800 mb-1">
                                    <span>Calling contacts...</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-blue-600 mt-2">
                                    Currently calling: {contacts[currentCallIndex]?.phoneNumber || '...'}
                                </p>
                            </div>
                        )}

                        {/* Fetching Results Status */}
                        {campaignStatus === 'fetching_results' && (
                            <div className="p-4 bg-purple-50 border-b border-purple-100">
                                <div className="flex items-center justify-center text-purple-800">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span className="text-sm font-medium">{fetchProgress || 'Fetching analytics...'}</span>
                                </div>
                            </div>
                        )}

                        {/* Results Table */}
                        <div className="flex-1 overflow-auto p-0">
                            {results.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0">
                                        <TableRow>
                                            <TableHead>Phone Number</TableHead>
                                            <TableHead>Info</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Call ID</TableHead>
                                            <TableHead>Transcript</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((result, idx) => (
                                            <TableRow key={idx} className={idx === currentCallIndex && campaignStatus === 'running' ? 'bg-blue-50' : ''}>
                                                <TableCell className="font-medium">{result.phoneNumber}</TableCell>
                                                <TableCell className="text-gray-500 text-xs">
                                                    {Object.entries(result.calleeInfo).map(([k, v]) => (
                                                        <div key={k}>{k}: {v}</div>
                                                    ))}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        {getStatusIcon(result.call_status)}
                                                        <span className="capitalize">{result.call_status.replace('_', ' ')}</span>
                                                    </div>
                                                    {result.analytics?.verdict && (
                                                        <div className={`text-xs mt-1 font-medium ${result.analytics.verdict === 'Hot Lead' ? 'text-green-600' :
                                                            result.analytics.verdict === 'Do Not Call' ? 'text-red-500' : 'text-gray-500'
                                                            }`}>
                                                            {result.analytics.verdict}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-gray-400">
                                                    {result.call_id ? result.call_id.substring(0, 8) + '...' : '-'}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate text-xs text-gray-600">
                                                    {result.transcript || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : contacts.length > 0 ? (
                                /* Contact Preview - shows when CSV is loaded but campaign not started */
                                <div className="h-full flex flex-col">
                                    <div className="bg-amber-50 border-b border-amber-200 p-3">
                                        <p className="text-sm text-amber-800 font-medium flex items-center">
                                            <Users className="w-4 h-4 mr-2" />
                                            Preview: {contacts.length} contact{contacts.length > 1 ? 's' : ''} ready to call
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1">
                                            Review your contacts below before starting the campaign
                                        </p>
                                    </div>
                                    <Table>
                                        <TableHeader className="bg-gray-50 sticky top-0">
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Phone Number</TableHead>
                                                <TableHead>Contact Info</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contacts.map((contact, idx) => (
                                                <TableRow key={idx} className="hover:bg-gray-50">
                                                    <TableCell className="text-gray-400 text-xs">{idx + 1}</TableCell>
                                                    <TableCell className="font-medium">{contact.phoneNumber}</TableCell>
                                                    <TableCell className="text-gray-600 text-sm">
                                                        {Object.entries(contact.calleeInfo).length > 0 ? (
                                                            Object.entries(contact.calleeInfo).map(([k, v]) => (
                                                                <span key={k} className="inline-block bg-gray-100 rounded px-2 py-0.5 mr-2 mb-1 text-xs">
                                                                    <span className="text-gray-500">{k}:</span> {v}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400">No additional info</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                                    <Upload className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Upload a CSV file to see contacts here</p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                            {results.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={downloadResults}
                                    disabled={campaignStatus === 'running' && campaignStatus !== 'completed'}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download CSV
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
