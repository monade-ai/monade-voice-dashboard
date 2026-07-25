'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileDown, Loader2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { EXPORT_MAX_ROWS, type CallAnalytics } from '@/app/hooks/use-analytics';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { ExportDateRangeField, type ExportDateRange } from '@/components/export-date-range-field';

export interface ExportableCall extends Transcript {
  analytics?: CallAnalytics;
}

export interface ExportFetchProgress {
  loaded: number;
  total: number;
}

export type ExportFetchAllRows = (opts: {
  signal: AbortSignal;
  onProgress: (progress: ExportFetchProgress) => void;
  /** Extra date/time window layered on the page's filters for this export. */
  dateRange?: ExportDateRange;
}) => Promise<{ rows: ExportableCall[]; truncated: boolean }>;

export type ExportCountRows = (opts: {
  signal: AbortSignal;
  dateRange?: ExportDateRange;
}) => Promise<number>;

interface ExportCsvDialogProps {
  /** Rows currently loaded on the page — the fallback set when no server pager is supplied. */
  calls: ExportableCall[];
  trigger?: React.ReactNode;
  /**
   * Total number of records matching the page's active filters. When provided
   * (alongside fetchAllRows) the export covers all of them, not just `calls`.
   */
  totalCount?: number;
  /**
   * Pulls every matching record from the server, paged. When present the export
   * is archive-wide (scoped to the active filters); when absent the dialog falls
   * back to exporting the loaded page only.
   */
  fetchAllRows?: ExportFetchAllRows;
  /** Counts matching records for the active filters + the dialog's date range. */
  countRows?: ExportCountRows;
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




export function ExportCsvDialog({ calls, trigger, totalCount, fetchAllRows, countRows }: ExportCsvDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Two-phase progress: first paging records off the server, then (full mode)
  // fetching transcript text. Null between phases / when idle.
  const [phase, setPhase] = useState<'records' | 'transcripts' | null>(null);
  const [progress, setProgress] = useState<ExportFetchProgress>({ loaded: 0, total: 0 });
  const [dateRange, setDateRange] = useState<ExportDateRange>({});
  const [rangeCount, setRangeCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasDateRange = Boolean(dateRange.from || dateRange.to);
  // Debounce so dragging through datetime spinners doesn't fire a count per tick.
  const debouncedRange = useDebouncedValue(dateRange, 400);

  // Export covers every record matching the page's filters when the page gives
  // us a server pager; otherwise it falls back to the loaded page.
  const canExportAll = Boolean(fetchAllRows);

  // When a date range is set we don't know the narrowed total without asking, so
  // fetch an exact count for the range. Without a range, the page's total already
  // reflects the active filters.
  useEffect(() => {
    if (!open || !canExportAll || !countRows) return;
    const active = Boolean(debouncedRange.from || debouncedRange.to);
    if (!active) {
      setRangeCount(null);
      setCounting(false);

      return;
    }

    const controller = new AbortController();
    setCounting(true);
    countRows({ signal: controller.signal, dateRange: debouncedRange })
      .then((n) => setRangeCount(n))
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('[CallArchiveExport] count failed:', err);
          setRangeCount(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCounting(false);
      });

    return () => controller.abort();
  }, [open, canExportAll, countRows, debouncedRange]);

  const previewCount = !canExportAll
    ? calls.length
    : hasDateRange
      ? (rangeCount ?? 0)
      : (totalCount ?? calls.length);

  // mode 'fast' skips the per-call transcript-text fetch (the only slow step) and exports
  // instantly with every column except the fetched Transcript text (URLs still included).
  // mode 'full' fetches transcript text for each call — accurate but slow on large ranges.
  const handleDownload = async (mode: 'fast' | 'full') => {
    if (previewCount === 0 || exporting) {
      if (previewCount === 0) toast.error('There are no records to export.');

      return;
    }
    setExporting(true);
    setPhase(canExportAll ? 'records' : null);
    setProgress({ loaded: 0, total: previewCount });
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // Resolve the dataset. With a server pager, walk every matching page (this
      // is the one place allowed to — it's a deliberate user action, not a
      // render). Without one, export the rows already on the page.
      let exportCalls = calls;
      let truncated = false;
      if (fetchAllRows) {
        const result = await fetchAllRows({
          signal,
          onProgress: (p) => setProgress(p),
          dateRange: hasDateRange ? dateRange : undefined,
        });
        exportCalls = result.rows;
        truncated = result.truncated;
      }

      if (signal.aborted) {
        toast.info('Export cancelled.');

        return;
      }

      if (exportCalls.length === 0) {
        toast.error('There are no records to export.');

        return;
      }

      // Fetch transcript text only for the calls being exported, preferring the enhanced
      // transcript. Bounded concurrency so a large range doesn't fire hundreds of requests.
      // Skipped entirely in 'fast' mode.
      const transcriptByCallId = new Map<string, string>();
      if (mode === 'full') {
        setPhase('transcripts');
        setProgress({ loaded: 0, total: exportCalls.length });

        const jobs = exportCalls
          .map((c) => ({
            callId: c.call_id,
            url: enhancedTranscriptUrlOf(c) || transcriptUrlOf(c),
          }))
          .filter((job) => job.callId && job.url);

        let done = 0;
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
            } finally {
              done += 1;
              setProgress({ loaded: done, total: jobs.length });
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
      const rows = exportCalls.map(call =>
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
      a.href = url;
      a.download = `call-archive_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Exported ${rows.length.toLocaleString()} record${rows.length === 1 ? '' : 's'} to CSV`
        + (mode === 'fast' ? ' (fast — no transcripts/recordings).' : '.'),
      );
      if (truncated) {
        toast.warning(
          `Export capped at ${rows.length.toLocaleString()} rows. Narrow the filters to export the rest.`,
        );
      }
      setOpen(false);
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        toast.info('Export cancelled.');
      } else {
        console.error('[CallArchiveExport] Failed:', err);
        toast.error('Failed to export call archive.');
      }
    } finally {
      abortRef.current = null;
      setPhase(null);
      setExporting(false);
    }
  };

  const handleCancelExport = () => {
    abortRef.current?.abort();
  };

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
            Export CSV
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
            {canExportAll
              ? <>Exports every call matching the filters currently applied on the page, across all
                pages — not just the page on screen.</>
              : <>Exports the calls currently loaded on the page.</>}
            {' '}<strong>Full Export</strong> includes the full transcript (enhanced when available)
            and recording URL — slower on large ranges. <strong>Fast Export</strong> skips those and
            returns quickly with call IDs, verdicts, analytics and billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {canExportAll && countRows && (
            <ExportDateRangeField onChange={setDateRange} disabled={exporting} />
          )}

          {/* Preview */}
          <section className="rounded-md border border-border/40 bg-muted/20 px-4 py-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ready to export
              </div>
              <div className="text-xl font-medium tracking-tight">
                {counting ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Counting…</span>
                  </span>
                ) : (
                  <>
                    {previewCount.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-2">
                      {!canExportAll
                        ? 'records on this page'
                        : hasDateRange ? 'records in range' : 'matching records'}
                    </span>
                  </>
                )}
              </div>
              {canExportAll && !counting && previewCount > EXPORT_MAX_ROWS && (
                <p className="text-[11px] text-orange-500 pt-1">
                  Only the first {EXPORT_MAX_ROWS.toLocaleString()} will be exported. Narrow the
                  date range to export a specific slice.
                </p>
              )}
            </div>
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
                {phase === 'records'
                  ? `Loading records… ${progress.loaded.toLocaleString()}${progress.total ? ` / ${progress.total.toLocaleString()}` : ''}`
                  : phase === 'transcripts'
                    ? `Fetching transcripts… ${progress.loaded.toLocaleString()} / ${progress.total.toLocaleString()}`
                    : 'Exporting…'}
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
                disabled={previewCount === 0}
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
                disabled={previewCount === 0}
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
