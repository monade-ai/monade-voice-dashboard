'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Loader2,
  Clipboard,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import { useCallAnalytics } from '@/app/hooks/use-analytics';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AudioPill } from '@/components/ui/audio-pill';
import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';
import { cn } from '@/lib/utils';

// --- Types ---

interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  speakerName?: string | null;
}

interface EnhancedTranscriptResponse {
  status: 'ready' | 'processing' | 'failed' | 'not_started';
  call_id: string;
  enhanced_transcript_url?: string;
  transcript?: Array<{
    timestamp?: string;
    end_timestamp?: string;
    sender?: string;
    speaker_name?: string | null;
    text?: string;
  }>;
  metadata?: {
    generated_at?: string;
    source?: string;
    model?: string;
  };
  error?: string;
  warning?: string;
}

interface TranscriptViewerProps {
  transcriptUrl: string;
  callId: string;
  onClose: () => void;
  /** Pre-fetched analytics (from batch endpoint) — avoids redundant single-call fetch and ensures billing_data is available */
  initialAnalytics?: import('@/app/hooks/use-analytics').CallAnalytics | null;
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
  initialAnalytics,
}) => {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTranscriptView, setActiveTranscriptView] = useState<'original' | 'enhanced'>('original');
  const [enhancedTranscript, setEnhancedTranscript] = useState<{
    status: 'idle' | 'checking' | 'processing' | 'ready' | 'failed';
    messages: TranscriptMessage[];
    generatedAt?: string;
    source?: string;
    model?: string;
    error?: string;
  }>({
    status: 'checking',
    messages: [],
  });

  const { analytics: fetchedAnalytics, loading: analyticsLoading, fetchByCallId } = useCallAnalytics();

  // Prefer pre-fetched analytics (has billing_data from batch endpoint), fall back to single-call fetch
  const analytics = initialAnalytics ?? fetchedAnalytics;

  // Get real customer name or fallback
  const customerName = analytics?.key_discoveries?.customer_name || 'Lead';
  const activeMessages = activeTranscriptView === 'enhanced' ? enhancedTranscript.messages : messages;
  const hasEnhancedTranscript = enhancedTranscript.status === 'ready' && enhancedTranscript.messages.length > 0;

  const mapEnhancedTranscriptMessages = (entries: EnhancedTranscriptResponse['transcript'] = []): TranscriptMessage[] => (
    entries.reduce<TranscriptMessage[]>((acc, entry) => {
      const text = entry.text?.trim();
      if (!text) return acc;

      acc.push({
        role: entry.sender === 'assistant' ? 'assistant' : 'user',
        content: text,
        timestamp: entry.timestamp,
        speakerName: entry.speaker_name ?? null,
      });

      return acc;
    }, [])
  );
  const enhancedTranscriptUrl = `${MONADE_API_BASE}/api/analytics/${encodeURIComponent(callId)}/enhanced-transcript`;

  const applyEnhancedTranscriptResponse = (data: EnhancedTranscriptResponse, options?: { activateOnReady?: boolean }) => {
    if (data.status === 'ready') {
      const nextMessages = mapEnhancedTranscriptMessages(data.transcript);

      setEnhancedTranscript({
        status: nextMessages.length > 0 ? 'ready' : 'failed',
        messages: nextMessages,
        generatedAt: data.metadata?.generated_at,
        source: data.metadata?.source,
        model: data.metadata?.model,
        error: nextMessages.length > 0 ? data.warning : 'Enhanced transcript was ready, but no transcript lines were returned.',
      });

      if (nextMessages.length > 0 && options?.activateOnReady !== false) {
        setActiveTranscriptView('enhanced');
      }

      return;
    }

    if (data.status === 'processing') {
      setEnhancedTranscript((current) => ({
        ...current,
        status: 'processing',
        error: undefined,
      }));
      return;
    }

    if (data.status === 'failed') {
      setEnhancedTranscript((current) => ({
        ...current,
        status: 'failed',
        error: data.error || 'Enhanced transcript failed.',
      }));
      return;
    }

    setEnhancedTranscript((current) => ({
      ...current,
      status: 'idle',
      error: undefined,
    }));
  };

  useEffect(() => {
    if (callId) fetchByCallId(callId);
  }, [callId, fetchByCallId]);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        setLoading(true);
        const data = await fetchJson<{ transcript?: string; raw?: string }>('/api/transcript-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: transcriptUrl }),
          retry: { retries: 2 },
        });

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
        console.error('[TranscriptViewer] Failed to load transcript:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [transcriptUrl]);

  useEffect(() => {
    let cancelled = false;

    const checkEnhancedTranscript = async () => {
      try {
        const data = await fetchJson<EnhancedTranscriptResponse>(enhancedTranscriptUrl, {
          retry: { retries: 0 },
        });

        if (cancelled) return;
        applyEnhancedTranscriptResponse(data);
      } catch {
        if (!cancelled) {
          setEnhancedTranscript({
            status: 'idle',
            messages: [],
          });
        }
      }
    };

    setEnhancedTranscript({
      status: 'checking',
      messages: [],
    });
    setActiveTranscriptView('original');
    checkEnhancedTranscript();

    return () => {
      cancelled = true;
    };
  }, [callId, enhancedTranscriptUrl]);

  useEffect(() => {
    if (enhancedTranscript.status !== 'processing') return;

    let cancelled = false;
    let pollTimeoutId: number | undefined;

    const poll = async () => {
      try {
        const data = await fetchJson<EnhancedTranscriptResponse>(enhancedTranscriptUrl, {
          retry: { retries: 0 },
        });

        if (cancelled) return;
        applyEnhancedTranscriptResponse(data);

        if (data.status === 'processing') {
          pollTimeoutId = window.setTimeout(poll, 2500);
        }
      } catch (error) {
        if (cancelled) return;

        setEnhancedTranscript((current) => ({
          ...current,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed while checking transcript enhancement.',
        }));
      }
    };

    pollTimeoutId = window.setTimeout(poll, 2500);

    return () => {
      cancelled = true;
      if (pollTimeoutId) {
        window.clearTimeout(pollTimeoutId);
      }
    };
  }, [enhancedTranscript.status, enhancedTranscriptUrl]);

  const handleEnhanceTranscript = async () => {
    try {
      setEnhancedTranscript((current) => ({
        ...current,
        status: 'processing',
        error: undefined,
      }));

      const data = await fetchJson<EnhancedTranscriptResponse>(enhancedTranscriptUrl, {
        method: 'POST',
        retry: { retries: 0 },
      });

      applyEnhancedTranscriptResponse(data);
    } catch (error) {
      setEnhancedTranscript((current) => ({
        ...current,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unable to enhance transcript right now.',
      }));
    }
  };

  const handleCopy = () => {
    if (!analytics?.summary) return;
    navigator.clipboard.writeText(analytics.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatEnhancedTimestamp = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    });
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
            'absolute top-0 left-0 w-full h-1',
            analytics?.verdict === 'interested' ? 'bg-green-500' :
              analytics?.verdict === 'callback' ? 'bg-primary' : 'bg-muted-foreground/20',
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
                      &quot;{analytics?.summary || 'Analyzing conversation context...'}&quot;
                    </p>
                    <button onClick={handleCopy} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                      {copied ? <Check size={12} className="text-green-500" /> : <Clipboard size={12} />}
                      {copied ? 'Copied' : ''}
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

            {/* Billing Breakdown — only for newer entries with billing_data */}
            {analytics?.billing_data ? (
              <div className="space-y-4 pt-4 border-t border-border/20">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Billing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Credits Used</span>
                    <span className="font-bold text-foreground">
                      {typeof analytics.billing_data.credits_used === 'number'
                        ? analytics.billing_data.credits_used.toFixed(2)
                        : '—'}
                    </span>
                  </div>
                  {analytics.billing_data.cost_per_minute != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Base Rate</span>
                      <span className="font-medium text-foreground">{analytics.billing_data.cost_per_minute} cr/min</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Recording</span>
                    <span className="font-medium text-foreground">
                      {analytics.billing_data.recording_enabled ? 'Yes' : 'No'}
                      {analytics.billing_data.recording_enabled && analytics.billing_data.recording_surcharge_total != null
                        ? ` (+${analytics.billing_data.recording_surcharge_total.toFixed(2)} cr)`
                        : ''}
                    </span>
                  </div>
                  {analytics.billing_data.call_direction && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Direction</span>
                      <span className="font-medium text-foreground capitalize">{analytics.billing_data.call_direction}</span>
                    </div>
                  )}
                  {analytics.duration_seconds != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {Math.floor(analytics.duration_seconds / 60)}m {analytics.duration_seconds % 60}s
                      </span>
                    </div>
                  )}
                  {analytics.call_started_at && analytics.call_ended_at && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium text-foreground text-[10px]">
                        {new Date(analytics.call_started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        {' — '}
                        {new Date(analytics.call_ended_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        {' IST'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : !analyticsLoading && analytics ? (
              <div className="pt-4 border-t border-border/20">
                <p className="text-[10px] text-muted-foreground/50 italic uppercase tracking-widest">
                  Billing data unavailable for this entry
                </p>
              </div>
            ) : null}

          </div>
        </div>

        {/* --- Right Pane: High-Contrast Conversation --- */}
        <div className="flex-1 bg-background flex flex-col h-full relative">

          <div className="h-14 border-b border-border/40 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Conversation Log</h2>
              <Separator orientation="vertical" className="h-3 opacity-20" />
              {hasEnhancedTranscript ? (
                <Badge variant="outline" className="h-6 rounded-full border-primary/25 bg-primary/5 px-2.5 text-[9px] font-bold uppercase tracking-[0.25em] text-primary">
                  Refined Ready
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnhanceTranscript}
                disabled={enhancedTranscript.status === 'processing'}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.24em] transition-all',
                  enhancedTranscript.status === 'processing'
                    ? 'border-primary/20 bg-primary/10 text-primary/70'
                    : 'border-border/60 bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
                )}
              >
                {enhancedTranscript.status === 'processing' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : enhancedTranscript.status === 'failed' ? (
                  <RefreshCw size={12} />
                ) : (
                  <Sparkles size={12} />
                )}
                {enhancedTranscript.status === 'processing'
                  ? 'Preparing Enhancement'
                  : enhancedTranscript.status === 'failed'
                    ? 'Retry Enhancement'
                    : hasEnhancedTranscript
                      ? 'Refresh Enhanced View'
                      : 'Enhance Transcript'}
              </button>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                <X size={16} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            <div className="max-w-xl mx-auto space-y-4">
              <AnimatePresence initial={false}>
                {enhancedTranscript.status === 'processing' ? (
                  <motion.div
                    key="enhancing-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.06]"
                  >
                    <div className="h-1 w-full bg-primary/10">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                      />
                    </div>
                    <div className="flex items-start gap-4 px-5 py-4">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-black">
                        <Sparkles size={14} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-primary">Preparing Enhanced Log</p>
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map((index) => (
                              <motion.span
                                key={index}
                                className="h-1.5 w-1.5 rounded-full bg-primary/80"
                                animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                                transition={{ repeat: Infinity, duration: 1, delay: index * 0.12 }}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/80">
                          We&apos;re restructuring the conversation into a cleaner, more reliable transcript. It will open here automatically as soon as it&apos;s ready.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {hasEnhancedTranscript ? (
                  <motion.div
                    key="enhanced-ready-card"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6"
                  >
                    <PaperCard variant="mesh" shaderProps={{ positions: 20, grainOverlay: 0.85 }} className="border-primary/15 bg-primary/[0.05]">
                      <PaperCardHeader className="flex flex-row items-start justify-between gap-4 p-5 pb-3">
                        <div className="space-y-2">
                          <PaperCardTitle className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-primary">
                            <Sparkles size={12} />
                            Refined Conversation
                          </PaperCardTitle>
                          <p className="text-sm leading-relaxed text-foreground/80">
                            A cleaner transcript is ready. You can move between the original log and the enhanced version instantly.
                          </p>
                        </div>
                        <Badge variant="outline" className="border-primary/25 bg-background/80 text-[9px] font-bold uppercase tracking-[0.24em] text-primary">
                          Ready
                        </Badge>
                      </PaperCardHeader>
                      <PaperCardContent className="flex flex-col gap-4 p-5 pt-0 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          {enhancedTranscript.generatedAt ? <span>Generated {formatEnhancedTimestamp(enhancedTranscript.generatedAt)}</span> : null}
                          {enhancedTranscript.model ? <span>{enhancedTranscript.model}</span> : null}
                          {enhancedTranscript.source ? <span>{enhancedTranscript.source.replaceAll('_', ' ')}</span> : null}
                        </div>
                        <div className="inline-flex rounded-full border border-border/50 bg-background/70 p-1">
                          <button
                            onClick={() => setActiveTranscriptView('original')}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors',
                              activeTranscriptView === 'original'
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Original
                          </button>
                          <button
                            onClick={() => setActiveTranscriptView('enhanced')}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors',
                              activeTranscriptView === 'enhanced'
                                ? 'bg-primary text-black'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Enhanced
                          </button>
                        </div>
                      </PaperCardContent>
                    </PaperCard>
                  </motion.div>
                ) : null}

                {enhancedTranscript.status === 'failed' && enhancedTranscript.error ? (
                  <motion.div
                    key="enhanced-failed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 rounded-2xl border border-border/50 bg-muted/20 px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Enhancement Unavailable</p>
                        <p className="text-sm text-foreground/80">{enhancedTranscript.error}</p>
                      </div>
                      <button
                        onClick={handleEnhanceTranscript}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Signal...</p>
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="text-center py-20 italic text-muted-foreground text-sm">Empty session.</div>
              ) : (
                activeMessages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col max-w-[90%]',
                      m.role === 'assistant' ? 'mr-auto items-start' : 'ml-auto items-end',
                    )}
                  >
                    <span className={cn(
                      'text-[9px] font-bold uppercase tracking-widest mb-1 px-1',
                      m.role === 'assistant' ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {m.role === 'assistant' ? (m.speakerName || 'Agent') : (m.speakerName || customerName)}
                    </span>
                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-[4px] shadow-sm text-sm leading-relaxed',
                        m.role === 'assistant'
                          ? 'bg-primary text-black font-medium'
                          : 'bg-foreground text-background font-normal',
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
            <AudioPill
              callId={callId}
              sipCallId={analytics?.sip_call_id}
              recordingUrl={analytics?.recording_url}
              durationMs={analytics?.recording_duration_ms}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TranscriptViewer;
