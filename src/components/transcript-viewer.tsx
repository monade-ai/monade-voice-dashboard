'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Bot, Loader2, AlertCircle } from 'lucide-react';

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

export function TranscriptViewer({ transcriptUrl, callId, onClose }: TranscriptViewerProps) {
    const [messages, setMessages] = useState<TranscriptMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rawData, setRawData] = useState<string>('');

    useEffect(() => {
        const fetchTranscript = async () => {
            try {
                setLoading(true);
                setError(null);

                // Use proxy API to avoid CORS issues
                const proxyUrl = `/api/transcripts/proxy?url=${encodeURIComponent(transcriptUrl)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    throw new Error(`Failed to fetch transcript: ${response.status}`);
                }

                const text = await response.text();
                setRawData(text);

                // Parse JSONL format (one JSON object per line)
                const lines = text.trim().split('\n').filter(line => line.trim());
                const parsedMessages: TranscriptMessage[] = [];

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);

                        // Skip metadata line (has "metadata" key)
                        if (parsed.metadata) {
                            continue;
                        }

                        // Main format: { sender: "user/assistant", text: ["..."], timestamp: "..." }
                        if (parsed.sender && parsed.text) {
                            const textContent = Array.isArray(parsed.text)
                                ? parsed.text.join(' ')
                                : parsed.text;

                            if (textContent && textContent.trim()) {
                                parsedMessages.push({
                                    role: parsed.sender === 'user' ? 'user' : 'assistant',
                                    content: textContent.trim(),
                                    timestamp: parsed.timestamp,
                                });
                            }
                        }
                        // Format: { role: "user/assistant", content: "..." }
                        else if (parsed.role && parsed.content) {
                            parsedMessages.push({
                                role: parsed.role === 'user' || parsed.role === 'human' ? 'user' : 'assistant',
                                content: Array.isArray(parsed.content) ? parsed.content.join(' ') : parsed.content,
                                timestamp: parsed.timestamp || parsed.created_at,
                            });
                        }
                        // Format: { speaker: "user/assistant", message: "..." }
                        else if (parsed.speaker && (parsed.message || parsed.text)) {
                            const content = parsed.message || parsed.text;
                            parsedMessages.push({
                                role: parsed.speaker === 'user' ? 'user' : 'assistant',
                                content: Array.isArray(content) ? content.join(' ') : content,
                                timestamp: parsed.timestamp,
                            });
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                        console.warn('Skipping invalid JSON line');
                    }
                }

                setMessages(parsedMessages);
            } catch (err) {
                console.error('Error fetching transcript:', err);
                setError(err instanceof Error ? err.message : 'Failed to load transcript');
            } finally {
                setLoading(false);
            }
        };

        fetchTranscript();
    }, [transcriptUrl]);

    // Format timestamp for display
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Call Transcript</h2>
                        <p className="text-sm text-gray-500">{callId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <p className="text-red-500 mb-2">{error}</p>
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
                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">Could not parse transcript messages</p>

                            {/* Show raw data preview */}
                            {rawData && (
                                <div className="text-left bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
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
                                {/* Avatar */}
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

                                {/* Message bubble */}
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
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <p className="text-xs text-gray-500 text-center">
                        {messages.length} messages in this conversation
                    </p>
                </div>
            </div>
        </div>
    );
}

export default TranscriptViewer;
