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
import { resolveCallDirection } from '@/lib/utils/call-outcome';
import {
  FULL_EXPORT_MAX_ROWS,
  FAST_EXPORT_MAX_ROWS,
  EXPORT_FILE_CHUNK_ROWS,
  type CallAnalytics,
} from '@/app/hooks/use-analytics';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { ExportDateRangeField, type ExportDateRange } from '@/components/export-date-range-field';

export interface HotLeadsExportProgress {
  loaded: number;
  total: number;
}

export type HotLeadsFetchAllRows = (opts: {
  signal: AbortSignal;
  onProgress: (progress: HotLeadsExportProgress) => void;
  /** Extra date/time window layered on the page's filters for this export. */
  dateRange?: ExportDateRange;
}) => Promise<{ rows: CallAnalytics[]; truncated: boolean }>;

// Streams matching leads in page-batches for a large Fast export.
export type HotLeadsStreamRows = (opts: {
  signal: AbortSignal;
  dateRange?: ExportDateRange;
}) => AsyncIterable<CallAnalytics[]>;

export type HotLeadsCountRows = (opts: {
  signal: AbortSignal;
  dateRange?: ExportDateRange;
}) => Promise<number>;

interface HotLeadsExportDialogProps {
  /** The curated hot-leads list (already filtered by the page's search/intent/confidence). */
  leads: CallAnalytics[];
  trigger?: React.ReactNode;
  /** Total leads matching the page's active filters, across all pages. */
  totalCount?: number;
  /** Pulls every matching lead from the server, paged. Present ⇒ archive-wide export. */
  fetchAllRows?: HotLeadsFetchAllRows;
  /** Streams matching leads for a large Fast export (chunked to multiple files). */
  streamAllRows?: HotLeadsStreamRows;
  /** Counts matching leads for the active filters + the dialog's date range. */
  countRows?: HotLeadsCountRows;
}

const leadDate = (lead: CallAnalytics): Date => new Date(lead.call_started_at || lead.created_at || 0);

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;

  return str;
}


const CSV_FIELDS = [
  'phone_number',
  'call_id',
  'campaign_id',
  'call_time',
  'call_direction',
  'verdict',
  'confidence_score',
  'call_quality',
  'duration_seconds',
  'price_quoted',
  'customer_name',
  'customer_location',
  'next_steps',
  'summary',
  'transcript',
  'transcript_url',
  'enhanced_transcript_url',
  'recording_url',
];

// Build the CSV for a batch of leads. Fast mode leaves the fetched transcript
// text and recording URL blank; the header stays identical so every chunk file
// shares one schema.
function buildLeadsCsv(
  leads: CallAnalytics[],
  mode: 'fast' | 'full',
  transcriptByCallId: Map<string, string>,
): string {
  const body = leads.map((lead) => {
    const discoveries = lead.key_discoveries || {};
    const durationSeconds = typeof discoveries.duration_seconds === 'number'
      ? discoveries.duration_seconds
      : lead.duration_seconds;
    const direction = resolveCallDirection(lead);

    return [
      lead.phone_number,
      lead.call_id,
      lead.campaign_id,
      leadDate(lead).toISOString(),
      direction === 'unknown' ? '' : direction,
      lead.verdict,
      lead.confidence_score,
      lead.call_quality,
      durationSeconds,
      discoveries.price_quoted,
      discoveries.customer_name,
      discoveries.customer_location,
      discoveries.next_steps,
      lead.summary,
      transcriptByCallId.get(lead.call_id) ?? '',
      lead.transcript_url,
      lead.enhanced_transcript_url,
      // Fast export omits the recording URL (transcript text is already blank above).
      mode === 'fast' ? '' : lead.recording_url,
    ].map(escapeCsv).join(',');
  });

  // ﻿ = UTF-8 BOM so Excel renders non-ASCII (₹, names) correctly.
  return `﻿${CSV_FIELDS.join(',')}\r\n${body.join('\r\n')}`;
}

function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HotLeadsExportDialog({ leads, trigger, totalCount, fetchAllRows, streamAllRows, countRows }: HotLeadsExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [phase, setPhase] = useState<'records' | 'writing' | 'transcripts' | null>(null);
  const [progress, setProgress] = useState<HotLeadsExportProgress>({ loaded: 0, total: 0 });
  const [dateRange, setDateRange] = useState<ExportDateRange>({});
  const [rangeCount, setRangeCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasDateRange = Boolean(dateRange.from || dateRange.to);
  const debouncedRange = useDebouncedValue(dateRange, 400);

  // Export covers every lead matching the page's filters when a server pager is
  // supplied; otherwise it falls back to the loaded page.
  const canExportAll = Boolean(fetchAllRows);

  // Exact count for the chosen date range (the page total already reflects the
  // other filters, so we only need to ask when a range narrows things further).
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
          console.warn('[HotLeadsExport] count failed:', err);
          setRangeCount(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCounting(false);
      });

    return () => controller.abort();
  }, [open, canExportAll, countRows, debouncedRange]);

  const previewCount = !canExportAll
    ? leads.length
    : hasDateRange
      ? (rangeCount ?? 0)
      : (totalCount ?? leads.length);

  // Full export fetches a transcript per lead, so it's bounded; Fast streams to
  // multiple files and can go far larger.
  const fullTooLarge = canExportAll && previewCount > FULL_EXPORT_MAX_ROWS;

  const fetchTranscripts = async (rows: CallAnalytics[], signal: AbortSignal): Promise<Map<string, string>> => {
    const transcriptByCallId = new Map<string, string>();
    const jobs = rows
      .map((lead) => ({ callId: lead.call_id, url: lead.enhanced_transcript_url || lead.transcript_url || '' }))
      .filter((job) => job.callId && job.url);

    let done = 0;
    const queue = [...jobs];
    const worker = async () => {
      while (queue.length > 0) {
        if (signal.aborted) return;
        const job = queue.shift();
        if (!job) break;
        try {
          const res = await fetchJson<{ transcript?: string }>('/api/transcript-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: job.url }),
            retry: { retries: 0 },
            signal,
          });
          if (res?.transcript) transcriptByCallId.set(job.callId, res.transcript);
        } catch (err) {
          if (signal.aborted) return;
          console.warn(`[HotLeadsExport] transcript fetch failed for ${job.callId}:`, err);
        } finally {
          done += 1;
          setProgress({ loaded: done, total: jobs.length });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));

    return transcriptByCallId;
  };

  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Large Fast export: stream leads off the server and flush one CSV file per
  // EXPORT_FILE_CHUNK_ROWS so memory stays bounded and early files survive a
  // late failure.
  const runFastStreamedExport = async (stream: HotLeadsStreamRows, signal: AbortSignal) => {
    const when = stamp();
    const multiFile = previewCount > EXPORT_FILE_CHUNK_ROWS;
    let buffer: CallAnalytics[] = [];
    let fileIndex = 0;
    let exported = 0;

    const flush = (rows: CallAnalytics[]) => {
      const part = multiFile ? `_part${fileIndex + 1}` : '';
      triggerCsvDownload(buildLeadsCsv(rows, 'fast', new Map()), `hot-leads${part}_${when}.csv`);
      fileIndex += 1;
    };

    for await (const batch of stream({ signal, dateRange: hasDateRange ? dateRange : undefined })) {
      if (signal.aborted) break;
      buffer.push(...batch);
      exported += batch.length;
      setProgress({ loaded: exported, total: previewCount });

      while (buffer.length >= EXPORT_FILE_CHUNK_ROWS) {
        setPhase('writing');
        flush(buffer.slice(0, EXPORT_FILE_CHUNK_ROWS));
        buffer = buffer.slice(EXPORT_FILE_CHUNK_ROWS);
        setPhase('records');
      }
    }

    if (signal.aborted) {
      toast.info(fileIndex > 0 ? `Export cancelled — ${fileIndex} file(s) already saved.` : 'Export cancelled.');

      return;
    }

    if (buffer.length > 0 || fileIndex === 0) flush(buffer);

    toast.success(
      `Exported ${exported.toLocaleString()} hot lead${exported === 1 ? '' : 's'}`
      + (fileIndex > 1 ? ` across ${fileIndex} files` : '')
      + ' (fast — no transcripts/recordings).',
    );
    if (exported >= FAST_EXPORT_MAX_ROWS) {
      toast.warning(
        `Reached the ${FAST_EXPORT_MAX_ROWS.toLocaleString()}-row export ceiling. Narrow the date range to get the rest.`,
      );
    }
  };

  const runBufferedExport = async (mode: 'fast' | 'full', signal: AbortSignal) => {
    let exportLeads = leads;
    let truncated = false;
    if (fetchAllRows) {
      const result = await fetchAllRows({
        signal,
        onProgress: (p) => setProgress(p),
        dateRange: hasDateRange ? dateRange : undefined,
      });
      exportLeads = result.rows;
      truncated = result.truncated;
    }
    if (signal.aborted) {
      toast.info('Export cancelled.');

      return;
    }
    if (exportLeads.length === 0) {
      toast.error('There are no hot leads to export.');

      return;
    }

    let transcriptByCallId = new Map<string, string>();
    if (mode === 'full') {
      setPhase('transcripts');
      setProgress({ loaded: 0, total: exportLeads.length });
      transcriptByCallId = await fetchTranscripts(exportLeads, signal);
      if (signal.aborted) {
        toast.info('Export cancelled.');

        return;
      }
    }

    triggerCsvDownload(buildLeadsCsv(exportLeads, mode, transcriptByCallId), `hot-leads_${stamp()}.csv`);
    toast.success(
      `Exported ${exportLeads.length.toLocaleString()} hot lead${exportLeads.length === 1 ? '' : 's'}`
      + (mode === 'fast' ? ' (fast — no transcripts/recordings).' : '.'),
    );
    if (truncated) {
      toast.warning(`Export capped at ${exportLeads.length.toLocaleString()} leads. Narrow the filters to export the rest.`);
    }
  };

  const handleDownload = async (mode: 'fast' | 'full') => {
    if (previewCount === 0 || exporting) {
      if (previewCount === 0) toast.error('There are no hot leads to export.');

      return;
    }
    if (mode === 'full' && fullTooLarge) {
      toast.error(
        `Full export is limited to ${FULL_EXPORT_MAX_ROWS.toLocaleString()} leads because it fetches a transcript per call. `
        + 'Use Fast export for a set this large.',
      );

      return;
    }

    setExporting(true);
    setPhase(canExportAll ? 'records' : null);
    setProgress({ loaded: 0, total: previewCount });
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      if (mode === 'fast' && streamAllRows) {
        await runFastStreamedExport(streamAllRows, signal);
      } else {
        await runBufferedExport(mode, signal);
      }
      if (!signal.aborted) setOpen(false);
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        toast.info('Export cancelled.');
      } else {
        console.error('[HotLeadsExport] Failed:', err);
        toast.error('Failed to export hot leads.');
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
        // Don't let the dialog close mid-export — that would orphan in-flight fetches.
        if (!next && exporting) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
          >
            <Download size={14} />
            Export CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Export Hot Leads to CSV
          </DialogTitle>
          <DialogDescription>
            {canExportAll
              ? <>Exports every hot lead matching the filters currently applied on the page, across
                all pages — not just the page on screen.</>
              : <>Exports the hot leads currently loaded on the page.</>}
            {' '}<strong>Full Export</strong> includes transcripts (enhanced when available) and
            recording links — best for smaller sets. <strong>Fast Export</strong> skips those,
            handles large sets, and splits into multiple files past
            {' '}{EXPORT_FILE_CHUNK_ROWS.toLocaleString()} rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {canExportAll && countRows && (
            <ExportDateRangeField onChange={setDateRange} disabled={exporting} />
          )}

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
                        ? 'hot leads on this page'
                        : hasDateRange ? 'hot leads in range' : 'matching hot leads'}
                    </span>
                  </>
                )}
              </div>
              {canExportAll && !counting && previewCount > EXPORT_FILE_CHUNK_ROWS && previewCount <= FAST_EXPORT_MAX_ROWS && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  Fast export will arrive as {Math.ceil(previewCount / EXPORT_FILE_CHUNK_ROWS)} CSV files
                  of up to {EXPORT_FILE_CHUNK_ROWS.toLocaleString()} rows each (your browser may ask to
                  allow multiple downloads).
                </p>
              )}
              {canExportAll && !counting && previewCount > FAST_EXPORT_MAX_ROWS && (
                <p className="text-[11px] text-orange-500 pt-1">
                  Fast export covers the first {FAST_EXPORT_MAX_ROWS.toLocaleString()} leads. Narrow the
                  date range to export the rest.
                </p>
              )}
              {fullTooLarge && !counting && (
                <p className="text-[11px] text-orange-500 pt-1">
                  Full export (with transcripts) is limited to {FULL_EXPORT_MAX_ROWS.toLocaleString()} leads —
                  use Fast export for this set.
                </p>
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={exporting} className="text-[10px] font-bold uppercase tracking-widest">
              Cancel
            </Button>
          </DialogClose>
          {exporting ? (
            // While exporting: show progress + an inline cross to abort the in-flight job.
            <div className="flex items-stretch rounded-md overflow-hidden bg-foreground text-background">
              <div className="flex items-center gap-2 pl-3 pr-2 text-[10px] font-bold uppercase tracking-widest">
                <Loader2 className="w-3 h-3 animate-spin" />
                {phase === 'records'
                  ? `Loading leads… ${progress.loaded.toLocaleString()}${progress.total ? ` / ${progress.total.toLocaleString()}` : ''}`
                  : phase === 'writing'
                    ? 'Writing file…'
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
                disabled={previewCount === 0 || fullTooLarge}
                size="sm"
                title={fullTooLarge
                  ? `Too many leads for Full export (limit ${FULL_EXPORT_MAX_ROWS.toLocaleString()}). Use Fast export.`
                  : 'Includes full transcripts & recording URLs — slower'}
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
