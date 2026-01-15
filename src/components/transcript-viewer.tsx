'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Bot, Loader2, AlertCircle, BarChart3, Target, Lightbulb, MessageSquare, TrendingUp } from 'lucide-react';
import { useCallAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';

interface TranscriptMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

interface TranscriptViewerProps {
    transcriptUrl: string;
    callId: string;
    onClose: () => void;
}

// Helper to safely convert any value to string
const toStringContent = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(v => toStringContent(v)).join(' ');
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.text) return toStringContent(obj.text);
        if (obj.content) return toStringContent(obj.content);
        if (obj.message) return toStringContent(obj.message);
        return JSON.stringify(value);
    }
    return String(value);
};

// Get verdict color
const getVerdictColor = (verdict: string | undefined) => {
    if (!verdict) return 'bg-gray-100 text-gray-700';
    const v = verdict.toLowerCase();
    if (v === 'interested' || v === 'success') return 'bg-green-100 text-green-700';
    if (v === 'not_interested' || v === 'failed') return 'bg-red-100 text-red-700';
    if (v === 'callback' || v === 'partial') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
};

// Get quality color
const getQualityColor = (quality: string | undefined) => {
    if (!quality) return 'bg-gray-100 text-gray-700';
    const q = quality.toLowerCase();
    if (q === 'high') return 'bg-green-100 text-green-700';
    if (q === 'medium') return 'bg-yellow-100 text-yellow-700';
    if (q === 'low' || q === 'abrupt_end') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
};

// Analytics Summary Component
const AnalyticsSummary: React.FC<{ analytics: CallAnalytics }> = ({ analytics }) => {
    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">AI Call Analysis</h3>
            </div>

            {/* Verdict & Confidence */}
            <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVerdictColor(analytics.verdict)}`}>
                    {analytics.verdict ? analytics.verdict.replace('_', ' ').toUpperCase() : 'N/A'}
                </span>
                <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">
                        Confidence: <span className="font-semibold">{analytics.confidence_score || 0}%</span>
                    </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${getQualityColor(analytics.call_quality)}`}>
                    {analytics.call_quality ? analytics.call_quality.replace('_', ' ') : 'unknown'}
                </span>
            </div>

            {/* Summary */}
            <div className="mb-3">
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <MessageSquare className="w-3 h-3" />
                    Summary
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{analytics.summary}</p>
            </div>

            {/* Key Discoveries */}
            {analytics.key_discoveries && Object.keys(analytics.key_discoveries).length > 0 && (
                <div className="mb-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <Lightbulb className="w-3 h-3" />
                        Key Discoveries
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(analytics.key_discoveries).map(([key, value]) => {
                            if (!value || (Array.isArray(value) && value.length === 0)) return null;
                            return (
                                <div key={key} className="bg-white/50 rounded px-2 py-1">
                                    <span className="text-xs text-gray-500">{key.replace('_', ' ')}: </span>
                                    <span className="text-xs font-medium text-gray-700">
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Use Case */}
            <div className="flex items-center text-xs text-gray-400 pt-2 border-t border-amber-200">
                <Target className="w-3 h-3 inline mr-1" />
                {analytics.use_case}
            </div>
        </div>
    );
};

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
    transcriptUrl,
    callId,
    onClose,
}) => {
    const [messages, setMessages] = useState<TranscriptMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rawData, setRawData] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'transcript' | 'analytics'>('transcript');

    // Fetch analytics for this call
    const { analytics, loading: analyticsLoading, fetchByCallId } = useCallAnalytics();

    useEffect(() => {
        // Fetch analytics when component mounts
        if (callId) {
            fetchByCallId(callId);
        }
    }, [callId, fetchByCallId]);

    useEffect(() => {
        const fetchTranscript = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('[TranscriptViewer] Fetching from:', transcriptUrl);

                const response = await fetch('/api/transcript-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: transcriptUrl }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }

                const data = await response.json();
                console.log('[TranscriptViewer] Response:', {
                    transcript: data.transcript?.substring(0, 100),
                    messageCount: data.messageCount,
                    rawLength: data.raw?.length
                });

                if (data.raw) {
                    setRawData(data.raw);
                }

                if (data.transcript && data.transcript.trim()) {
                    const lines = data.transcript.split('\n');
                    const parsedMessages: TranscriptMessage[] = [];

                    for (const line of lines) {
                        if (line.startsWith('Assistant:')) {
                            parsedMessages.push({
                                role: 'assistant',
                                content: line.substring('Assistant:'.length).trim()
                            });
                        } else if (line.startsWith('User:')) {
                            parsedMessages.push({
                                role: 'user',
                                content: line.substring('User:'.length).trim()
                            });
                        }
                    }

                    if (parsedMessages.length > 0) {
                        setMessages(parsedMessages);
                        return;
                    }
                }

                // Fallback: parse raw JSONL
                if (data.raw) {
                    const lines = data.raw.trim().split('\n').filter((line: string) => line.trim());
                    const parsedMessages: TranscriptMessage[] = [];

                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.metadata) continue;

                            let role: 'user' | 'assistant' = 'assistant';
                            let content = '';

                            if (parsed.sender) {
                                role = parsed.sender === 'user' ? 'user' : 'assistant';
                            } else if (parsed.role) {
                                role = (parsed.role === 'user' || parsed.role === 'human') ? 'user' : 'assistant';
                            }

                            if (parsed.text !== undefined) {
                                content = toStringContent(parsed.text);
                            } else if (parsed.content !== undefined) {
                                content = toStringContent(parsed.content);
                            } else if (parsed.message !== undefined) {
                                content = toStringContent(parsed.message);
                            }

                            if (content && content.trim()) {
                                parsedMessages.push({
                                    role,
                                    content: content.trim(),
                                    timestamp: parsed.timestamp || parsed.created_at,
                                });
                            }
                        } catch {
                            // Skip invalid lines
                        }
                    }

                    setMessages(parsedMessages);
                }
            } catch (err) {
                console.error('[TranscriptViewer] Error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load transcript');
            } finally {
                setLoading(false);
            }
        };

        fetchTranscript();
    }, [transcriptUrl]);

    const formatTime = (timestamp: string | undefined) => {
        if (!timestamp) return '';
        try {
            return new Date(timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Call Details</h2>
                        <p className="text-sm text-gray-500">{callId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 flex gap-2">
                    <button
                        onClick={() => setActiveTab('transcript')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'transcript'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4 inline mr-1" />
                        Transcript
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-1" />
                        AI Summary
                        {analytics && <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {activeTab === 'analytics' ? (
                        // Analytics Tab
                        analyticsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : analytics ? (
                            <AnalyticsSummary analytics={analytics} />
                        ) : (
                            <div className="text-center py-12">
                                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No AI analysis available for this call yet.</p>
                                <p className="text-sm text-gray-400 mt-1">Analysis is generated after each call ends.</p>
                            </div>
                        )
                    ) : (
                        // Transcript Tab
                        loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                                <p className="text-red-600 mb-4">{error}</p>
                                <a
                                    href={transcriptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-600 hover:underline"
                                >
                                    Open raw transcript
                                </a>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-8">
                                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-2 font-medium">No conversation yet</p>
                                <p className="text-gray-500 text-sm mb-4">
                                    This call may still be connecting or only contains metadata.
                                </p>

                                {rawData && (
                                    <div className="text-left bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto mt-4">
                                        <p className="text-xs text-gray-400 mb-2">Raw transcript data:</p>
                                        <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                                            {rawData.substring(0, 2000)}
                                            {rawData.length > 2000 ? '...' : ''}
                                        </pre>
                                    </div>
                                )}

                                <a
                                    href={transcriptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-600 hover:underline mt-4 inline-block"
                                >
                                    View full raw file
                                </a>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-blue-100' : 'bg-amber-100'
                                            }`}
                                    >
                                        {message.role === 'user' ? (
                                            <User className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Bot className="w-4 h-4 text-amber-600" />
                                        )}
                                    </div>

                                    <div
                                        className={`max-w-[75%] px-4 py-3 rounded-2xl ${message.role === 'user'
                                            ? 'bg-blue-500 text-white rounded-br-md'
                                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed">{message.content}</p>
                                        {message.timestamp && (
                                            <p
                                                className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                                                    }`}
                                            >
                                                {formatTime(message.timestamp)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <p className="text-sm text-gray-500 text-center">
                        {activeTab === 'transcript'
                            ? messages.length > 0
                                ? `${messages.length} message${messages.length === 1 ? '' : 's'} in this conversation`
                                : 'Waiting for conversation data...'
                            : analytics
                                ? 'AI-powered call analysis'
                                : 'No analysis available'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TranscriptViewer;
