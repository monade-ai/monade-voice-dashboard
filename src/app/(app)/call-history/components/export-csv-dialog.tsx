'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, FileDown, Filter, Loader2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { fetchJson } from '@/lib/http';
import type { Transcript } from '@/app/hooks/use-transcripts';
import type { CallAnalytics } from '@/app/hooks/use-analytics';

export interface ExportableCall extends Transcript {
  analytics?: CallAnalytics;
}

type RangePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type DirectionFilter = 'all' | 'inbound' | 'outbound';
type VerdictFilter = 'all' | 'interested' | 'not_interested' | 'callback' | 'no_answer' | 'conversation';

interface ExportCsvDialogProps {
  calls: ExportableCall[];
  trigger?: React.ReactNode;
}

// The two transcript URLs live on either the Transcript record or its analytics.
// Mirror the "Conversation Log" viewer: prefer the enhanced transcript when present.
function transcriptUrlOf(c: ExportableCall): string {
  return c.analytics?.transcript_url || c.transcript_url || '';
}

function enhancedTranscriptUrlOf(c: ExportableCall): string {
  return c.analytics?.enhanced_transcript_url || '';
}

const CSV_COLUMNS: {
  key: string;
  label: string;
  get: (c: ExportableCall, transcripts: Map<string, string>) => unknown;
}[] = [
  { key: 'call_id', label: 'Call ID', get: (c) => c.call_id },
  { key: 'phone_number', label: 'Phone Number', get: (c) => c.phone_number },
  {
    key: 'direction',
    label: 'Direction',
    get: (c) => c.analytics?.billing_data?.call_direction
      ?? c.analytics?.provider_call_status?.direction
      ?? '',
  },
  { key: 'verdict', label: 'Verdict', get: (c) => c.analytics?.verdict ?? '' },
  { key: 'call_quality', label: 'Call Quality', get: (c) => c.analytics?.call_quality ?? '' },
  {
    key: 'confidence_score',
    label: 'Confidence Score',
    get: (c) => (typeof c.analytics?.confidence_score === 'number' ? c.analytics.confidence_score : ''),
  },
  { key: 'use_case', label: 'Use Case', get: (c) => c.analytics?.use_case ?? '' },
  { key: 'summary', label: 'Summary', get: (c) => c.analytics?.summary ?? '' },
  {
    key: 'duration_seconds',
    label: 'Duration (sec)',
    get: (c) => c.analytics?.duration_seconds
      ?? (typeof c.analytics?.key_discoveries?.duration_seconds === 'number'
        ? c.analytics.key_discoveries.duration_seconds
        : ''),
  },
  { key: 'status', label: 'Status', get: (c) => c.analytics?.provider_call_status?.status ?? '' },
  { key: 'hangup_cause', label: 'Hangup Cause', get: (c) => c.analytics?.provider_call_status?.hangup_cause ?? '' },
  { key: 'call_started_at', label: 'Started At', get: (c) => c.analytics?.call_started_at ?? '' },
  { key: 'call_ended_at', label: 'Ended At', get: (c) => c.analytics?.call_ended_at ?? '' },
  { key: 'created_at', label: 'Created At', get: (c) => c.created_at ?? '' },
  { key: 'campaign_id', label: 'Campaign ID', get: (c) => c.analytics?.campaign_id ?? '' },
  { key: 'customer_name', label: 'Customer Name', get: (c) => c.analytics?.key_discoveries?.customer_name ?? '' },
  { key: 'customer_location', label: 'Customer Location', get: (c) => c.analytics?.key_discoveries?.customer_location ?? '' },
  { key: 'customer_language', label: 'Customer Language', get: (c) => c.analytics?.key_discoveries?.customer_language ?? '' },
  { key: 'service_type', label: 'Service Type', get: (c) => c.analytics?.key_discoveries?.service_type ?? '' },
  { key: 'price_quoted', label: 'Price Quoted', get: (c) => c.analytics?.key_discoveries?.price_quoted ?? '' },
  {
    key: 'objections_raised',
    label: 'Objections Raised',
    get: (c) => {
      const ob = c.analytics?.key_discoveries?.objections_raised;
      if (Array.isArray(ob)) return ob.join('; ');

      return ob ?? '';
    },
  },
  { key: 'next_steps', label: 'Next Steps', get: (c) => c.analytics?.key_discoveries?.next_steps ?? '' },
  { key: 'credits_used', label: 'Credits Used', get: (c) => c.analytics?.billing_data?.credits_used ?? '' },
  { key: 'cost_per_minute', label: 'Cost Per Minute', get: (c) => c.analytics?.billing_data?.cost_per_minute ?? '' },
  { key: 'settlement_status', label: 'Settlement Status', get: (c) => c.analytics?.billing_data?.settlement_status ?? '' },
  { key: 'assistant_id', label: 'Assistant ID', get: (c) => c.analytics?.billing_data?.assistant_id ?? '' },
  { key: 'recording_url', label: 'Recording URL', get: (c) => c.analytics?.recording_url ?? '' },
  { key: 'sip_call_id', label: 'SIP Call ID', get: (c) => c.analytics?.sip_call_id ?? '' },
  // Transcript: fetched text (enhanced preferred), then the raw URLs — same as Hot Leads export.
  { key: 'transcript', label: 'Transcript', get: (c, transcripts) => transcripts.get(c.call_id) ?? '' },
  { key: 'transcript_url', label: 'Transcript URL', get: (c) => transcriptUrlOf(c) },
  { key: 'enhanced_transcript_url', label: 'Enhanced Transcript URL', get: (c) => enhancedTranscriptUrlOf(c) },
];

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (typeof value === 'string') {
    str = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    str = String(value);
  } else {
    try {
      str = JSON.stringify(value);
    } catch {
      str = '';
    }
  }
  // RFC 4180: wrap in quotes if contains comma/quote/newline; escape inner quotes by doubling.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function toDateOnlyInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);

  return x;
}

export function ExportCsvDialog({ calls, trigger }: ExportCsvDialogProps) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<RangePreset>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [verdict, setVerdict] = useState<VerdictFilter>('all');
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    const now = new Date();
    if (p === 'all') {
      setFromDate('');
      setToDate('');
    } else if (p === 'today') {
      const today = toDateOnlyInput(now);
      setFromDate(today);
      setToDate(today);
    } else if (p === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const ys = toDateOnlyInput(y);
      setFromDate(ys);
      setToDate(ys);
    } else if (p === 'week') {
      const w = new Date(now);
      w.setDate(now.getDate() - 7);
      setFromDate(toDateOnlyInput(w));
      setToDate(toDateOnlyInput(now));
    } else if (p === 'month') {
      const m = new Date(now);
      m.setDate(now.getDate() - 30);
      setFromDate(toDateOnlyInput(m));
      setToDate(toDateOnlyInput(now));
    }
    // 'custom' leaves existing from/to as-is.
  };

  const filteredCalls = useMemo(() => {
    const fromTs = fromDate ? startOfDay(new Date(fromDate)).getTime() : null;
    const toTs = toDate ? endOfDay(new Date(toDate)).getTime() : null;

    return calls.filter((c) => {
      const createdMs = new Date(c.created_at).getTime();
      if (fromTs !== null && createdMs < fromTs) return false;
      if (toTs !== null && createdMs > toTs) return false;

      if (direction !== 'all') {
        const dir = (c.analytics?.billing_data?.call_direction
          || c.analytics?.provider_call_status?.direction
          || '').toLowerCase();
        if (dir !== direction) return false;
      }

      if (verdict !== 'all') {
        const v = c.analytics?.verdict || (c.has_conversation ? 'conversation' : 'no_answer');
        if (v !== verdict) return false;
      }

      if (connectedOnly && !(c.has_conversation || c.analytics)) return false;

      return true;
    });
  }, [calls, fromDate, toDate, direction, verdict, connectedOnly]);

  // mode 'fast' skips the per-call transcript-text fetch (the only slow step) and exports
  // instantly with every column except the fetched Transcript text (URLs still included).
  // mode 'full' fetches transcript text for each call — accurate but slow on large ranges.
  const handleDownload = async (mode: 'fast' | 'full') => {
    if (filteredCalls.length === 0 || exporting) {
      if (filteredCalls.length === 0) toast.error('No records match the selected filters.');

      return;
    }
    setExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // Fetch transcript text only for the calls being exported, preferring the enhanced
      // transcript. Bounded concurrency so a large range doesn't fire hundreds of requests.
      // Skipped entirely in 'fast' mode.
      const transcriptByCallId = new Map<string, string>();
      if (mode === 'full') {
        const jobs = filteredCalls
          .map((c) => ({
            callId: c.call_id,
            url: enhancedTranscriptUrlOf(c) || transcriptUrlOf(c),
          }))
          .filter((job) => job.callId && job.url);

        const queue = [...jobs];
        const worker = async () => {
          while (queue.length > 0) {
            if (signal.aborted) return; // stop pulling new work the moment we're cancelled
            const job = queue.shift();
            if (!job) break;
            try {
              const res = await fetchJson<{ transcript?: string }>(
                '/api/transcript-content',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: job.url }),
                  retry: { retries: 0 },
                  signal,
                },
              );
              if (res?.transcript) transcriptByCallId.set(job.callId, res.transcript);
            } catch (err) {
              if (signal.aborted) return; // aborted fetches throw — exit quietly
              // Surface, don't swallow — a blank transcript cell should be explainable.
              console.warn(`[CallArchiveExport] transcript fetch failed for ${job.callId}:`, err);
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));

        if (signal.aborted) {
          toast.info('Export cancelled.');

          return;
        }
      }

      // Fast export omits the heavy/fetched columns: the transcript text (already blank,
      // since we skipped the fetch above) and the recording URL. Same header row either
      // way so the CSV schema stays stable — the cells are just left empty.
      const skipKeys = mode === 'fast' ? new Set(['transcript', 'recording_url']) : null;
      const header = CSV_COLUMNS.map(c => escapeCsv(c.label)).join(',');
      const rows = filteredCalls.map(call =>
        CSV_COLUMNS.map(col =>
          escapeCsv(skipKeys?.has(col.key) ? '' : col.get(call, transcriptByCallId)),
        ).join(','),
      );
      // ﻿ = UTF-8 BOM so Excel detects UTF-8 (₹, names, non-ASCII) correctly.
      const csv = '﻿' + [header, ...rows].join('\r\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const rangeTag = fromDate || toDate
        ? `_${fromDate || 'start'}_to_${toDate || 'end'}`
        : '';
      a.href = url;
      a.download = `call-archive${rangeTag}_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Exported ${rows.length.toLocaleString()} record${rows.length === 1 ? '' : 's'} to CSV`
        + (mode === 'fast' ? ' (fast — no transcripts/recordings).' : '.'),
      );
      setOpen(false);
    } catch (err) {
      if (signal.aborted) {
        toast.info('Export cancelled.');
      } else {
        console.error('[CallArchiveExport] Failed:', err);
        toast.error('Failed to export call archive.');
      }
    } finally {
      abortRef.current = null;
      setExporting(false);
    }
  };

  const handleCancelExport = () => {
    abortRef.current?.abort();
  };

  const resetFilters = () => {
    setPreset('all');
    setFromDate('');
    setToDate('');
    setDirection('all');
    setVerdict('all');
    setConnectedOnly(false);
  };

  const presetOptions: { label: string; value: RangePreset }[] = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'week' },
    { label: 'Last 30 Days', value: 'month' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let the dialog close mid-export — that would orphan the in-flight fetches.
        if (!next && exporting) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-[#facc15] hover:border-[#facc15] hover:text-black transition-all"
          >
            <Download className="w-3 h-3" />
            Export Archive
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Export Call Archive to CSV
          </DialogTitle>
          <DialogDescription>
            Choose a time range and optional filters. <strong>Full Export</strong> includes the
            full transcript (enhanced when available) and recording URL — accurate but slow on
            large ranges. <strong>Fast Export</strong> skips those and returns instantly with all
            call IDs, phone numbers, verdicts, analytics and billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Time Range */}
          <section className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">
              Time Range
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {presetOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(opt.value)}
                  className={cn(
                    'h-7 text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
                    preset === opt.value
                      ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background'
                      : 'hover:bg-muted',
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="export-from" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  From
                </Label>
                <Input
                  id="export-from"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="export-to" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  To
                </Label>
                <Input
                  id="export-to"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Filters
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="export-direction" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Direction
                </Label>
                <select
                  id="export-direction"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as DirectionFilter)}
                  className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-3"
                >
                  <option value="all">All</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="export-verdict" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Verdict
                </Label>
                <select
                  id="export-verdict"
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value as VerdictFilter)}
                  className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-3"
                >
                  <option value="all">All</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="callback">Callback</option>
                  <option value="no_answer">No Answer</option>
                  <option value="conversation">In Progress</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={connectedOnly}
                onChange={(e) => setConnectedOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-foreground"
              />
              <span className="text-xs text-muted-foreground">Connected calls only</span>
            </label>
          </section>

          {/* Preview */}
          <section className="rounded-md border border-border/40 bg-muted/20 px-4 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ready to export
              </div>
              <div className="text-xl font-medium tracking-tight">
                {filteredCalls.length.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-2">
                  of {calls.length.toLocaleString()} records
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={exporting}
              className="h-7 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              className="text-[10px] font-bold uppercase tracking-widest"
            >
              Cancel
            </Button>
          </DialogClose>
          {exporting ? (
            // While exporting: show progress + an inline cross to abort the in-flight job.
            <div className="flex items-stretch rounded-md overflow-hidden bg-foreground text-background">
              <div className="flex items-center gap-2 pl-3 pr-2 text-[10px] font-bold uppercase tracking-widest">
                <Loader2 className="w-3 h-3 animate-spin" />
                Fetching transcripts…
              </div>
              <button
                type="button"
                onClick={handleCancelExport}
                aria-label="Cancel export"
                title="Cancel export"
                className="flex items-center justify-center px-2 border-l border-background/30 hover:bg-red-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                onClick={() => handleDownload('fast')}
                disabled={filteredCalls.length === 0}
                variant="outline"
                size="sm"
                title="Skips transcripts & recording URLs — instant"
                className="gap-2 text-[10px] font-bold uppercase tracking-widest"
              >
                <Zap className="w-3 h-3" />
                Fast Export
              </Button>
              <Button
                onClick={() => handleDownload('full')}
                disabled={filteredCalls.length === 0}
                size="sm"
                title="Includes full transcripts & recording URLs — slower"
                className="gap-2 text-[10px] font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90"
              >
                <Download className="w-3 h-3" />
                Full Export
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
