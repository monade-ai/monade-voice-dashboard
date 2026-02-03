'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  AlertCircle,
  Clipboard,
  Check,
  Zap,
  Phone
} from 'lucide-react';
import { useCallAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AudioPill } from '@/components/ui/audio-pill';
import { cn } from '@/lib/utils';

// --- Types ---

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

// --- Helper Components ---

const FactItem = ({ label, value }: { label: string, value: any }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{label.replace('_', ' ')}</p>
            <p className="text-xs font-medium text-foreground">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
        </div>
    );
};

// --- Main Component ---

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
    transcriptUrl,
    callId,
    onClose,
}) => {
    const [messages, setMessages] = useState<TranscriptMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { analytics, loading: analyticsLoading, fetchByCallId } = useCallAnalytics();

    // Get real customer name or fallback
    const customerName = analytics?.key_discoveries?.customer_name || "Lead";

    useEffect(() => {
        if (callId) fetchByCallId(callId);
    }, [callId, fetchByCallId]);

    useEffect(() => {
        const fetchTranscript = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/transcript-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: transcriptUrl }),
                });
                if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
                const data = await response.json();

                if (data.transcript) {
                    const lines = data.transcript.split('\n');
                    const parsedMessages: TranscriptMessage[] = [];
                    for (const line of lines) {
                        if (line.startsWith('Assistant:')) {
                            parsedMessages.push({ role: 'assistant', content: line.substring(10).trim() });
                        } else if (line.startsWith('User:')) {
                            parsedMessages.push({ role: 'user', content: line.substring(5).trim() });
                        }
                    }
                    if (parsedMessages.length > 0) {
                        setMessages(parsedMessages);
                        return;
                    }
                }
                
                if (data.raw) {
                    const lines = data.raw.trim().split('\n');
                    const parsedMessages = lines.map((l: string) => {
                        try {
                            const p = JSON.parse(l);
                            if (p.metadata) return null;
                            const role = (p.sender === 'user' || p.role === 'user' || p.role === 'human') ? 'user' : 'assistant';
                            const content = p.text || p.content || p.message || '';
                            if (!content) return null;
                            return { role, content: String(content).trim(), timestamp: p.timestamp };
                        } catch { return null; }
                    }).filter(Boolean) as TranscriptMessage[];
                    setMessages(parsedMessages);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                setLoading(false);
            }
        };
        fetchTranscript();
    }, [transcriptUrl]);

    const handleCopy = () => {
        if (!analytics?.summary) return;
        navigator.clipboard.writeText(analytics.summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-background/40 backdrop-blur-md"
            />

            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="relative bg-background border border-border shadow-2xl rounded-md w-full max-w-6xl h-[85vh] flex overflow-hidden flex-col md:flex-row"
            >
                {/* --- Left Pane: AI Intelligence --- */}
                <div className="w-full md:w-[38%] border-r border-border bg-muted/5 flex flex-col h-full relative overflow-hidden">
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-1",
                        analytics?.verdict === 'interested' ? "bg-green-500" : 
                        analytics?.verdict === 'callback' ? "bg-primary" : "bg-muted-foreground/20"
                    )} />

                    <div className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">AI Intelligence</h2>
                                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-border/60 bg-background">
                                    {analytics?.call_quality || 'Unknown'} 
                                </Badge>
                            </div>
                            <h1 className="text-3xl font-medium tracking-tight mt-4 capitalize">
                                {analytics?.verdict?.replace('_', ' ') || 'Processing...'}
                            </h1>
                        </div>

                        <PaperCard variant="mesh" shaderProps={{ positions: 20, grainOverlay: 0.9 }} className="border-border/40">
                            <PaperCardHeader className="p-5 pb-2">
                                <PaperCardTitle className="text-[9px]"> Summary</PaperCardTitle>
                            </PaperCardHeader>
                            <PaperCardContent className="p-5 pt-2">
                                {analyticsLoading ? (
                                    <div className="h-20 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm leading-relaxed text-foreground/90 italic">
                                            "{analytics?.summary || "Analyzing conversation context..."}"
                                        </p>
                                        <button onClick={handleCopy} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                                            {copied ? <Check size={12} className="text-green-500" /> : <Clipboard size={12} />}
                                            {copied ? "Copied" : ""}
                                        </button>
                                    </div>
                                )}
                            </PaperCardContent>
                        </PaperCard>

                        <div className="space-y-6 pt-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Extracted Facts</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <FactItem label="Customer" value={analytics?.key_discoveries?.customer_name} />
                                <FactItem label="Location" value={analytics?.key_discoveries?.customer_location} />
                                <FactItem label="Service" value={analytics?.key_discoveries?.service_type} />
                                <FactItem label="Price Quoted" value={analytics?.key_discoveries?.price_quoted} />
                                <FactItem label="Language" value={analytics?.key_discoveries?.customer_language} />
                                <FactItem label="Next Steps" value={analytics?.key_discoveries?.next_steps} />
                            </div>
                        </div>


                    </div>
                </div>

                {/* --- Right Pane: High-Contrast Conversation --- */}
                <div className="flex-1 bg-background flex flex-col h-full relative">
                    
                    <div className="h-14 border-b border-border/40 flex items-center justify-between px-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Conversation Log</h2>
                            <Separator orientation="vertical" className="h-3 opacity-20" />

                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                            <X size={16} className="text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                        <div className="max-w-xl mx-auto space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Signal...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-20 italic text-muted-foreground text-sm">Empty session.</div>
                            ) : (
                                messages.map((m, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "flex flex-col max-w-[90%]",
                                            m.role === 'assistant' ? "mr-auto items-start" : "ml-auto items-end"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-widest mb-1 px-1",
                                            m.role === 'assistant' ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {m.role === 'assistant' ? 'Agent' : customerName}
                                        </span>
                                        <div 
                                            className={cn(
                                                "px-4 py-2.5 rounded-[4px] shadow-sm text-sm leading-relaxed",
                                                m.role === 'assistant' 
                                                    ? "bg-primary text-black font-medium" 
                                                    : "bg-foreground text-background font-normal"
                                            )}
                                        >
                                            {m.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="h-20 border-t border-border/40 bg-muted/5 flex items-center px-8 shrink-0 relative z-20">
                        <AudioPill />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TranscriptViewer;
