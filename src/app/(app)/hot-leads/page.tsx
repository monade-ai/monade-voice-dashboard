'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowUpRight,
  CalendarDays,
  Target,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Download,
} from 'lucide-react';

import { useUserAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';
import { useCallRecording } from '@/app/hooks/use-call-recording';
import { QualificationBucket, usePostProcessingTemplates } from '@/app/hooks/use-post-processing-templates';
import { DashboardHeader } from '@/components/dashboard-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LeadIcon } from '@/components/ui/lead-icon';
import { cn } from '@/lib/utils';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { HotLeadsGuide } from './components/hot-leads-guide';

const TranscriptViewer = dynamic(
  () => import('@/components/transcript-viewer'),
  { ssr: false },
);

// --- Helpers (Memoized externally or stable) ---

const BUCKET_PALETTE = [
  { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', accent: 'text-green-600' },
  { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', accent: 'text-primary' },
  { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', accent: 'text-orange-500' },
  { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', accent: 'text-blue-500' },
  { color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', accent: 'text-purple-500' },
  { color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', accent: 'text-pink-500' },
];

const NEUTRAL_CONFIG = {
  label: 'Unknown', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', accent: 'text-muted-foreground',
};

const humanizeKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const resolveVerdictConfig = (
  verdict: string | undefined,
  bucketIndex: Map<string, { bucket: QualificationBucket; index: number }>,
) => {
  if (!verdict) return NEUTRAL_CONFIG;
  const match = bucketIndex.get(verdict.toLowerCase());
  if (match) {
    const palette = BUCKET_PALETTE[match.index % BUCKET_PALETTE.length];

    return { label: match.bucket.label || humanizeKey(match.bucket.key), ...palette };
  }

  return { ...NEUTRAL_CONFIG, label: humanizeKey(verdict) };
};

const formatCurrency = (val: string | undefined) => {
  if (!val) return null;

  return val.includes('$') || val.includes('₹') ? val : `₹${val}`;
};

const getLeadDate = (lead: CallAnalytics) => new Date(lead.call_started_at || lead.created_at || 0);
const formatLeadDate = (lead: CallAnalytics) => (
  lead.call_started_at || lead.created_at ? getLeadDate(lead).toLocaleDateString() : '—'
);

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameLocalDay = (a: Date, b: Date) => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;

  return text;
};

const downloadTextFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// --- Component: DealRow (Memoized for Performance) ---

const DealRow = React.memo(({ lead, onClick, bucketIndex }: {
  lead: CallAnalytics;
  onClick: () => void;
  bucketIndex: Map<string, { bucket: QualificationBucket; index: number }>;
}) => {
  const config = resolveVerdictConfig(lead.verdict, bucketIndex);
  const confidence = lead.confidence_score || 0;
  const price = formatCurrency(lead.key_discoveries?.price_quoted as string);
  const confidenceColor = confidence >= 80 ? 'text-green-500' : confidence >= 50 ? 'text-yellow-500' : 'text-red-500';

  // Recording playback — same pattern as Call History row.
  // Hook is called unconditionally; UI shown only when a recording is reachable.
  const hasRecording = !!(lead.sip_call_id || lead.recording_url);
  const {
    loading: recordingLoading,
    isPlaying,
    formattedCurrentTime,
    progress,
    togglePlay,
    downloadUrl,
    recordingUrl,
    fetchRecording,
  } = useCallRecording(
    lead.call_id,
    lead.recording_url,
    lead.recording_duration_ms,
  );

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between p-5 border-b border-border/10 hover:bg-muted/30 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

      {/* 1. Lead Identity (30%) */}
      <div className="flex items-center gap-5 w-[30%]">
        <div className="shrink-0">
          <LeadIcon seed={lead.call_id} size={40} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground tracking-tight">{lead.phone_number}</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {formatLeadDate(lead)}
          </span>
        </div>
      </div>

      {/* 2. Intent & Confidence (25%) */}
      <div className="w-[25%] flex items-center gap-6">
        <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full border', config.bg, config.border)}>
          <span className={cn('text-[10px] font-bold uppercase tracking-widest', config.color)}>{config.label}</span>
        </div>
        <div className="flex items-center gap-1.5 pl-2 border-l border-border/40">
          <span className={cn('text-xl font-mono font-bold leading-none', confidenceColor)}>{confidence}%</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Match</span>
        </div>
      </div>

      {/* 3. Intelligence Snippet (25%) */}
      <div className="w-[25%] pr-6 border-l border-border/10 pl-6">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                    &quot;{lead.summary}&quot;
        </p>
      </div>

      {/* 4. Value & Action (20%) */}
      <div className="w-[20%] flex items-center justify-end gap-3">
        {price && (
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Value</span>
            <span className="text-base font-mono font-bold text-foreground">{price}</span>
          </div>
        )}

        {hasRecording && (
          <div className="flex items-center gap-2">
            <motion.button
              layout
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              disabled={recordingLoading}
              className={cn(
                'h-8 flex items-center bg-foreground text-background font-bold tracking-widest overflow-hidden transition-all duration-500 rounded-full disabled:opacity-60',
                isPlaying ? 'px-3 gap-3 w-44' : 'px-3 gap-2 w-auto',
              )}
              title={recordingLoading ? 'Preparing recording…' : isPlaying ? 'Pause' : 'Play recording'}
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                {recordingLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={12} fill="currentColor" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                {!isPlaying && !recordingLoading && (
                  <span className="text-[9px] uppercase">Play</span>
                )}
                {recordingLoading && (
                  <span className="text-[9px] uppercase">Preparing</span>
                )}
              </div>

              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex items-center gap-2"
                >
                  <div className="flex-1 h-1 bg-background/20 rounded-full relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="absolute inset-y-0 left-0 bg-background"
                    />
                  </div>
                  <span className="text-[8px] font-mono tabular-nums opacity-60">{formattedCurrentTime}</span>
                </motion.div>
              )}
            </motion.button>

            {hasRecording && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const url = downloadUrl || recordingUrl || await fetchRecording();
                  if (!url) return;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `recording-${lead.call_id}.mp3`;
                  a.target = '_blank';
                  a.rel = 'noopener noreferrer';
                  a.click();
                }}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
                title="Download recording"
              >
                <Download size={12} />
              </button>
            )}
          </div>
        )}

        <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-sm">
          <ArrowUpRight size={18} />
        </div>
      </div>
    </div>
  );
});
DealRow.displayName = 'DealRow';

// --- Main Page ---

export default function HotLeadsPage() {
  const { analytics: allAnalytics, loading, fetchAll } = useUserAnalytics();
  const { resolvedTemplate } = usePostProcessingTemplates();
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<CallAnalytics | null>(null);

  // Filter States
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7d' | '30d' | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build bucket lookup from active template
  const buckets = useMemo<QualificationBucket[]>(
    () => resolvedTemplate?.content?.qualification_buckets || [],
    [resolvedTemplate],
  );
  const bucketIndex = useMemo(() => {
    const map = new Map<string, { bucket: QualificationBucket; index: number }>();
    buckets.forEach((bucket, index) => {
      if (bucket.key) map.set(bucket.key.toLowerCase(), { bucket, index });
    });

    return map;
  }, [buckets]);

  // Heuristic: hide buckets that look explicitly negative from the "hot leads" curation
  const isNegativeKey = useCallback((key: string) => {
    const k = key.toLowerCase();

    return k.includes('not_') || k.startsWith('not')
      || k.includes('failed') || k.includes('dnc') || k.includes('wrong')
      || k.includes('disconnect') || k.includes('declined') || k.includes('reject');
  }, []);

  const positiveBuckets = useMemo(
    () => buckets.filter((bucket) => !isNegativeKey(bucket.key || '')),
    [buckets, isNegativeKey],
  );

  // Memoized Filter Logic (Heavy Calculation)
  const hotLeads = useMemo(() => {
    return allAnalytics.filter(a => {
      if ((a.confidence_score || 0) < 50) return false;
      const v = (a.verdict || '').toLowerCase();
      if (!v) return false;
      if (isNegativeKey(v)) return false;

      // Search
      if (search && !a.phone_number?.includes(search) && !a.summary?.toLowerCase().includes(search.toLowerCase())) return false;

      // Intent (exact bucket key match)
      if (intentFilter !== 'all' && v !== intentFilter.toLowerCase()) return false;

      // Confidence
      if (confidenceFilter === 'high' && (a.confidence_score || 0) < 80) return false;

      // Date
      const leadDate = getLeadDate(a);
      const now = new Date();
      const today = startOfLocalDay(now);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      if (dateFilter === 'today' && !isSameLocalDay(leadDate, now)) return false;
      if (dateFilter === 'yesterday' && !isSameLocalDay(leadDate, yesterday)) return false;
      if (dateFilter === '7d' && leadDate < sevenDaysAgo) return false;
      if (dateFilter === '30d' && leadDate < thirtyDaysAgo) return false;

      return true;
    }).sort((a, b) => getLeadDate(b).getTime() - getLeadDate(a).getTime());
  }, [allAnalytics, search, intentFilter, dateFilter, confidenceFilter, isNegativeKey]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(hotLeads.length / itemsPerPage));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = useMemo(() => {
    const start = (effectiveCurrentPage - 1) * itemsPerPage;

    return hotLeads.slice(start, start + itemsPerPage);
  }, [hotLeads, effectiveCurrentPage]);

  // Stats Logic — dynamic per-bucket count for the active template's positive buckets
  const bucketStats = useMemo(() => {
    return positiveBuckets.map((bucket) => ({
      bucket,
      count: hotLeads.filter((l) => (l.verdict || '').toLowerCase() === bucket.key.toLowerCase()).length,
    }));
  }, [hotLeads, positiveBuckets]);

  // Handlers (Stabilized)
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(Math.min(Math.max(1, newPage), totalPages));
  }, [totalPages]);

  const handleSelectLead = useCallback((lead: CallAnalytics) => {
    setSelectedLead(lead);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (hotLeads.length === 0) return;
    const fields = [
      'phone_number',
      'call_id',
      'campaign_id',
      'call_time',
      'verdict',
      'confidence_score',
      'call_quality',
      'duration_seconds',
      'price_quoted',
      'customer_name',
      'customer_location',
      'next_steps',
      'summary',
      'transcript_url',
      'enhanced_transcript_url',
      'recording_url',
    ];
    const rows = hotLeads.map((lead) => {
      const discoveries = lead.key_discoveries || {};
      const durationSeconds = typeof discoveries.duration_seconds === 'number'
        ? discoveries.duration_seconds
        : lead.duration_seconds;

      return [
        lead.phone_number,
        lead.call_id,
        lead.campaign_id,
        getLeadDate(lead).toISOString(),
        lead.verdict,
        lead.confidence_score,
        lead.call_quality,
        durationSeconds,
        discoveries.price_quoted,
        discoveries.customer_name,
        discoveries.customer_location,
        discoveries.next_steps,
        lead.summary,
        lead.transcript_url,
        lead.enhanced_transcript_url,
        lead.recording_url,
      ].map(escapeCSV).join(',');
    });

    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`\uFEFF${fields.join(',')}\n${rows.join('\n')}`, `hot-leads-${stamp}.csv`);
  }, [hotLeads]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-12">

        <HotLeadsGuide />
        
        {/* Header Horizon */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Deal Room</h1>
            <p className="text-muted-foreground text-sm font-medium">High-value opportunities requiring priority handling.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input 
                placeholder="Search leads..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 w-64 bg-muted/10 border-border/40 text-xs focus:ring-primary transition-all rounded-md"
              />
            </div>
                
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all min-w-[120px] justify-between">
                  <div className="flex items-center gap-2"><CalendarDays size={14} /> {dateFilter === 'all' ? 'All Time' : dateFilter === 'today' ? 'Today' : dateFilter === 'yesterday' ? 'Yesterday' : dateFilter === '7d' ? 'Last 7 Days' : 'Last 30 Days'}</div>
                  <ChevronDown size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDateFilter('today')}>Today</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('yesterday')}>Yesterday</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('7d')}>Last 7 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('30d')}>Last 30 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('all')}>All Time</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={hotLeads.length === 0}
              className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
            >
              <Download size={14} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 border-b border-border/20 pb-6 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">Target Intent:</span>
          <div className="flex gap-2">
            <button
              key="all"
              onClick={() => setIntentFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border',
                intentFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50',
              )}
            >
              All
            </button>
            {positiveBuckets.map((bucket) => (
              <button
                key={bucket.key}
                onClick={() => setIntentFilter(bucket.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap',
                  intentFilter === bucket.key ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50',
                )}
              >
                {bucket.label || humanizeKey(bucket.key)}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-border/40 mx-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Confidence:</span>
          <button 
            onClick={() => setConfidenceFilter(confidenceFilter === 'all' ? 'high' : 'all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center gap-2',
              confidenceFilter === 'high' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50',
            )}
          >
                High-Match Only ({'>'}80%)
          </button>
        </div>

        {/* Pipeline Telemetry — dynamic per-bucket counts from the active qualification template */}
        {bucketStats.length > 0 ? (
          <div className={cn(
            'grid grid-cols-1 gap-6',
            bucketStats.length === 1 ? 'md:grid-cols-1' : bucketStats.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3',
          )}>
            {bucketStats.slice(0, 6).map(({ bucket, count }, index) => {
              const palette = BUCKET_PALETTE[index % BUCKET_PALETTE.length];

              return (
                <PaperCard
                  key={bucket.key}
                  variant="default"
                  className={cn('border', palette.border, palette.bg.replace('/10', '/[0.02]'))}
                >
                  <PaperCardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className={cn('text-[9px] font-bold uppercase tracking-widest', palette.accent)}>
                        {bucket.label || humanizeKey(bucket.key)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold font-mono text-foreground">{count}</span>
                        <span className="text-xs text-muted-foreground">Leads</span>
                      </div>
                    </div>
                    <Target size={24} className={cn(palette.color, 'opacity-20')} />
                  </PaperCardContent>
                </PaperCard>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PaperCard variant="default" className="bg-primary/[0.02] border-primary/20">
              <PaperCardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Qualified Leads</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold font-mono text-foreground">{hotLeads.length}</span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>
                <Target size={24} className="text-primary opacity-20" />
              </PaperCardContent>
            </PaperCard>
          </div>
        )}

        {/* The Deal Ledger */}
        <section className="space-y-6 pb-32">
          <div className="bg-card rounded-md border border-border/20 overflow-hidden min-h-[400px] flex flex-col">
                
            {/* Table Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20 bg-muted/5">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[30%] pl-1">Lead Identity</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[25%]">Intent & Match</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[25%]">Intelligence Snippet</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[20%] text-right pr-2">Opportunity Value</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Deals...</span>
              </div>
            ) : hotLeads.length === 0 ? (
              <div className="py-32 text-center text-xs text-muted-foreground italic uppercase tracking-widest">
                        No opportunities match your current filters.
              </div>
            ) : (
              <div className="flex flex-col flex-1">
                {paginatedLeads.map((lead) => (
                  <DealRow
                    key={lead.call_id}
                    lead={lead}
                    bucketIndex={bucketIndex}
                    onClick={() => handleSelectLead(lead)}
                  />
                ))}
              </div>
            )}

            {/* Pagination Footer */}
            {hotLeads.length > 0 && (
              <div className="p-4 border-t border-border/10 flex items-center justify-between bg-muted/5 mt-auto">
                <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                            Page {effectiveCurrentPage} of {totalPages} ({hotLeads.length} Total)
                </span>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handlePageChange(effectiveCurrentPage - 1)} 
                    disabled={effectiveCurrentPage === 1} 
                    className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => handlePageChange(effectiveCurrentPage + 1)} 
                    disabled={effectiveCurrentPage === totalPages} 
                    className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>

      {selectedLead && selectedLead.transcript_url && selectedLead.call_id && (
        <TranscriptViewer
          transcriptUrl={selectedLead.transcript_url}
          callId={selectedLead.call_id}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
