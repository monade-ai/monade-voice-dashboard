'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Loader2,
  Clipboard,
  Check,
  Sparkles,
  RefreshCw,
  Wand2,
  GitCompare,
} from 'lucide-react';

import { invalidateAnalyticsCaches, useCallAnalytics } from '@/app/hooks/use-analytics';
import { usePostProcessingTemplates } from '@/app/hooks/use-post-processing-templates';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AudioPill } from '@/components/ui/audio-pill';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';
import { cn } from '@/lib/utils';
import { deriveCallOutcome } from '@/lib/utils/call-outcome';

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

interface ReanalyzeResponse {
  committed: boolean;
  template_id?: string | null;
  template_name?: string;
  analysis: import('@/app/hooks/use-analytics').CallAnalytics;
  history_length?: number;
  updated_at?: string;
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

const FALLBACK_FACT_KEYS = [
  { key: 'customer_name', label: 'Customer' },
  { key: 'customer_location', label: 'Location' },
  { key: 'service_type', label: 'Service' },
  { key: 'price_quoted', label: 'Price Quoted' },
  { key: 'customer_language', label: 'Language' },
  { key: 'next_steps', label: 'Next Steps' },
];

const getFallbackTemplateLabel = (verdict?: string) => {
  if (!verdict) return 'Processing';

  return verdict.replace(/_/g, ' ');
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
  const [templateForAnalytics, setTemplateForAnalytics] = useState<any | null>(null);
  const [templateForPreview, setTemplateForPreview] = useState<any | null>(null);
  const [templateLookupState, setTemplateLookupState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const [reanalyzeTemplateId, setReanalyzeTemplateId] = useState<'__active__' | string>('__active__');
  const [reanalyzeLoading, setReanalyzeLoading] = useState(false);
  const [reanalyzeSaving, setReanalyzeSaving] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<ReanalyzeResponse | null>(null);

  const { analytics: fetchedAnalytics, loading: analyticsLoading, fetchByCallId } = useCallAnalytics();
  const {
    templates,
    resolvedTemplate,
    fetchTemplate,
    fetchResolvedTemplate,
  } = usePostProcessingTemplates();

  // Prefer pre-fetched analytics (has billing_data from batch endpoint), fall back to single-call fetch
  const analytics = fetchedAnalytics ?? initialAnalytics ?? null;

  // Get real customer name or fallback
  const customerName = analytics?.key_discoveries?.customer_name || 'Lead';
  const activeMessages = activeTranscriptView === 'enhanced' ? enhancedTranscript.messages : messages;
  const hasEnhancedTranscript = enhancedTranscript.status === 'ready' && enhancedTranscript.messages.length > 0;
  const currentTemplateId = analytics?.post_processing_template_id || null;

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

  const applyEnhancedTranscriptResponse = useCallback((data: EnhancedTranscriptResponse, options?: { activateOnReady?: boolean }) => {
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
  }, []);

  useEffect(() => {
    if (callId) fetchByCallId(callId);
  }, [callId, fetchByCallId]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalyticsTemplate = async () => {
      setTemplateLookupState('loading');
      setTemplateForAnalytics(null);

      try {
        if (currentTemplateId) {
          const template = await fetchTemplate(currentTemplateId);
          if (!cancelled) {
            setTemplateForAnalytics(template);
            setTemplateLookupState(template ? 'idle' : 'missing');
          }

          return;
        }

        const resolved = resolvedTemplate ?? await fetchResolvedTemplate();
        if (!cancelled) {
          setTemplateForAnalytics(resolved);
          setTemplateLookupState(resolved ? 'idle' : 'missing');
        }
      } catch {
        if (!cancelled) {
          setTemplateLookupState('missing');
          setTemplateForAnalytics(null);
        }
      }
    };

    if (analytics) {
      loadAnalyticsTemplate();
    } else {
      setTemplateLookupState('idle');
      setTemplateForAnalytics(null);
    }

    return () => {
      cancelled = true;
    };
  }, [analytics, currentTemplateId, fetchResolvedTemplate, fetchTemplate, resolvedTemplate]);

  useEffect(() => {
    let cancelled = false;

    const loadPreviewTemplate = async () => {
      try {
        if (reanalyzeTemplateId === '__active__') {
          const resolved = resolvedTemplate ?? await fetchResolvedTemplate();
          if (!cancelled) {
            setTemplateForPreview(resolved);
          }

          return;
        }

        const template = await fetchTemplate(reanalyzeTemplateId);
        if (!cancelled) {
          setTemplateForPreview(template);
        }
      } catch {
        if (!cancelled) {
          setTemplateForPreview(null);
        }
      }
    };

    loadPreviewTemplate();

    return () => {
      cancelled = true;
    };
  }, [fetchResolvedTemplate, fetchTemplate, reanalyzeTemplateId, resolvedTemplate]);

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
  }, [applyEnhancedTranscriptResponse, callId, enhancedTranscriptUrl]);

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
  }, [applyEnhancedTranscriptResponse, enhancedTranscript.status, enhancedTranscriptUrl]);

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

  const currentTemplateContent = templateForAnalytics?.content ?? null;
  const currentTemplateName = templateForAnalytics?.name ?? 'Default Monade Rules';
  const renderedFacts = useMemo(() => {
    if (!analytics) return [];

    const dynamicFacts = currentTemplateContent?.data_points?.length
      ? currentTemplateContent.data_points
        .map((dataPoint: any) => ({
          label: dataPoint.label,
          value: analytics.key_discoveries?.[dataPoint.key],
        }))
        .filter((item: { label: string; value: unknown }) => (
          item.value !== undefined && item.value !== null && (!Array.isArray(item.value) || item.value.length > 0)
        ))
      : [];

    if (dynamicFacts.length > 0) {
      return dynamicFacts;
    }

    return FALLBACK_FACT_KEYS
      .map((fact) => ({
        label: fact.label,
        value: analytics.key_discoveries?.[fact.key],
      }))
      .filter((item) => item.value !== undefined && item.value !== null && (!Array.isArray(item.value) || item.value.length > 0));
  }, [analytics, currentTemplateContent]);

  const currentVerdictLabel = useMemo(() => {
    const matchingBucket = currentTemplateContent?.qualification_buckets?.find(
      (bucket: any) => bucket.key === analytics?.verdict,
    );

    return matchingBucket?.label || getFallbackTemplateLabel(analytics?.verdict);
  }, [analytics?.verdict, currentTemplateContent]);

  const previewVerdictLabel = useMemo(() => {
    const previewTemplateContent = templateForPreview?.content ?? currentTemplateContent;
    const matchingBucket = previewTemplateContent?.qualification_buckets?.find(
      (bucket: any) => bucket.key === previewAnalysis?.analysis?.verdict,
    );

    return matchingBucket?.label
      || getFallbackTemplateLabel(previewAnalysis?.analysis?.verdict);
  }, [currentTemplateContent, previewAnalysis?.analysis?.verdict, templateForPreview]);

  const handleReanalyze = async (commit = false) => {
    try {
      if (commit) {
        setReanalyzeSaving(true);
      } else {
        setReanalyzeLoading(true);
      }
      setReanalyzeError(null);

      const body: Record<string, unknown> = {
        call_id: callId,
        commit,
      };

      if (reanalyzeTemplateId !== '__active__') {
        body.template_id = reanalyzeTemplateId;
      }

      const result = await fetchJson<ReanalyzeResponse>(`${MONADE_API_BASE}/api/post-processing/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        retry: { retries: 0 },
      });

      setPreviewAnalysis(result);

      if (commit) {
        invalidateAnalyticsCaches(callId);
        await fetchByCallId(callId, true);
      }
    } catch (error) {
      setReanalyzeError(error instanceof Error ? error.message : 'Unable to re-analyze this call right now.');
    } finally {
      setReanalyzeLoading(false);
      setReanalyzeSaving(false);
    }
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
        <div className="w-full md:w-[38%] border-r border-border bg-muted/5 h-[40vh] md:h-full relative overflow-hidden">
          <div className={cn(
            'absolute top-0 left-0 w-full h-1 z-10',
            analytics?.verdict === 'interested' ? 'bg-green-500' :
              analytics?.verdict === 'callback' ? 'bg-primary' : 'bg-muted-foreground/20',
          )} />

          <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar space-y-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">AI Intelligence</h2>
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-border/60 bg-background">
                  {analytics?.call_quality || 'Unknown'}
                </Badge>
              </div>
              <h1 className="text-3xl font-medium tracking-tight mt-4 capitalize">
                {currentVerdictLabel || 'Processing...'}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-border/60 bg-background">
                  {currentTemplateName}
                </Badge>
                {templateLookupState === 'missing' && (
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-orange-500/30 text-orange-500 bg-orange-500/5">
                    Template Metadata Missing
                  </Badge>
                )}
              </div>
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
                    <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                      <p className="text-sm leading-relaxed text-foreground/90 italic">
                        &quot;{analytics?.summary || 'Analyzing conversation context...'}&quot;
                      </p>
                    </div>
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
                {renderedFacts.map((fact) => (
                  <FactItem key={fact.label} label={fact.label} value={fact.value} />
                ))}
              </div>
            </div>

            <PaperCard className="border-primary/15 bg-primary/[0.04]">
              <PaperCardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <PaperCardTitle className="flex items-center gap-2 text-primary">
                      <Wand2 size={12} />
                      Qualification Sandbox
                    </PaperCardTitle>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      Preview different qualification rules on this call before applying them.
                    </p>
                  </div>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-5 pt-0 space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Ruleset</span>
                  <Select value={reanalyzeTemplateId} onValueChange={(value) => setReanalyzeTemplateId(value as '__active__' | string)}>
                    <SelectTrigger className="h-10 bg-background border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__active__">Use Current Live Ruleset</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => handleReanalyze(false)}
                    disabled={reanalyzeLoading || reanalyzeSaving}
                    className="flex-1 h-10 text-[10px] font-bold uppercase tracking-[0.2em]"
                  >
                    {reanalyzeLoading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <GitCompare size={14} className="mr-2" />}
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleReanalyze(true)}
                    disabled={reanalyzeLoading || reanalyzeSaving || !previewAnalysis}
                    className="flex-1 h-10 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                  >
                    {reanalyzeSaving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Wand2 size={14} className="mr-2" />}
                    Apply
                  </Button>
                </div>

                {reanalyzeError && (
                  <p className="text-xs text-destructive">{reanalyzeError}</p>
                )}

                {previewAnalysis && (
                  <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                        Preview Result
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-[0.18em] border-primary/25 text-primary">
                        {previewAnalysis.template_name || 'Selected Rules'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-border/20 bg-muted/10 p-3">
                        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Current</span>
                        <p className="mt-2 text-sm font-semibold text-foreground capitalize">{currentVerdictLabel}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{analytics?.confidence_score ?? 0}% confidence</p>
                      </div>
                      <div className="rounded-md border border-primary/20 bg-primary/[0.05] p-3">
                        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-primary/80">Preview</span>
                        <p className="mt-2 text-sm font-semibold text-foreground capitalize">{previewVerdictLabel}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{previewAnalysis.analysis.confidence_score ?? 0}% confidence</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Updated Summary</span>
                      <p className="text-xs leading-relaxed text-foreground/85">
                        {previewAnalysis.analysis.summary}
                      </p>
                    </div>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>

            {/* Billing Breakdown — only for newer entries with billing_data.
                NOTE: keep timing/duration sourced from the original `duration_seconds` only.
                Don't fall back to provider_call_status.duration — it can be misleading or empty. */}
            {analytics?.billing_data ? (
              <div className="space-y-4 pt-4 border-t border-border/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Billing</h3>
                  {analytics.billing_data.settlement_status === 'failed' && (
                    <Badge variant="outline" className="text-[9px] uppercase tracking-[0.2em] border-red-500/40 bg-red-500/10 text-red-500">
                      Settlement Failed
                    </Badge>
                  )}
                </div>
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

            {/* Call Outcome — derived from Vobiz provider_call_status.
                See src/lib/utils/call-outcome.ts for the mapping. */}
            {(() => {
              const outcome = deriveCallOutcome(analytics?.provider_call_status);

              if (outcome) {
                return (
                  <div className="space-y-4 pt-4 border-t border-border/20">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Call Outcome</h3>
                    <div className="flex items-center gap-3">
                      <span className={cn('w-2 h-2 rounded-full', outcome.dot)} />
                      <span className={cn('text-sm font-bold', outcome.tone)}>{outcome.label}</span>
                    </div>
                    {outcome.outcome === 'failed' && outcome.reason && (
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        {outcome.reason}
                      </p>
                    )}
                  </div>
                );
              }

              if (!analyticsLoading && analytics) {
                return (
                  <div className="pt-4 border-t border-border/20">
                    <p className="text-[10px] text-muted-foreground/50 italic uppercase tracking-widest">
                      Call status not yet available
                    </p>
                  </div>
                );
              }

              return null;
            })()}

            {/* Recording Metadata — only if backend has fetched it */}
            {analytics?.recording_metadata ? (
              <div className="space-y-4 pt-4 border-t border-border/20">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Recording</h3>
                <div className="space-y-2">
                  {analytics.recording_metadata.from_number && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">From</span>
                      <span className="font-mono text-[10px] text-foreground">{analytics.recording_metadata.from_number}</span>
                    </div>
                  )}
                  {analytics.recording_metadata.to_number && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-mono text-[10px] text-foreground">{analytics.recording_metadata.to_number}</span>
                    </div>
                  )}
                  {analytics.recording_metadata.duration_ms != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {(analytics.recording_metadata.duration_ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
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
