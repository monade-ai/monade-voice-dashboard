'use client';

import React, { useRef, useState } from 'react';
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
import { EXPORT_MAX_ROWS, type CallAnalytics } from '@/app/hooks/use-analytics';

export interface HotLeadsExportProgress {
  loaded: number;
  total: number;
}

export type HotLeadsFetchAllRows = (opts: {
  signal: AbortSignal;
  onProgress: (progress: HotLeadsExportProgress) => void;
}) => Promise<{ rows: CallAnalytics[]; truncated: boolean }>;

interface HotLeadsExportDialogProps {
  /** The curated hot-leads list (already filtered by the page's search/intent/confidence). */
  leads: CallAnalytics[];
  trigger?: React.ReactNode;
  /** Total leads matching the page's active filters, across all pages. */
  totalCount?: number;
  /** Pulls every matching lead from the server, paged. Present ⇒ archive-wide export. */
  fetchAllRows?: HotLeadsFetchAllRows;
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

export function HotLeadsExportDialog({ leads, trigger, totalCount, fetchAllRows }: HotLeadsExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [phase, setPhase] = useState<'records' | 'transcripts' | null>(null);
  const [progress, setProgress] = useState<HotLeadsExportProgress>({ loaded: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  // Export covers every lead matching the page's filters when a server pager is
  // supplied; otherwise it falls back to the loaded page.
  const canExportAll = Boolean(fetchAllRows);
  const previewCount = canExportAll ? (totalCount ?? leads.length) : leads.length;

  const handleDownload = async (mode: 'fast' | 'full') => {
    if (previewCount === 0 || exporting) {
      if (previewCount === 0) toast.error('There are no hot leads to export.');

      return;
    }
    setExporting(true);
    setPhase(canExportAll ? 'records' : null);
    setProgress({ loaded: 0, total: previewCount });
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // Resolve the dataset: walk every matching page off the server when we can,
      // else export the leads already on the page.
      let exportLeads = leads;
      let truncated = false;
      if (fetchAllRows) {
        const result = await fetchAllRows({ signal, onProgress: (p) => setProgress(p) });
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

      // Fetch transcript text only for the leads being exported, preferring the enhanced
      // transcript. Bounded concurrency so a large range doesn't fire hundreds of requests.
      // Skipped entirely in 'fast' mode.
      const transcriptByCallId = new Map<string, string>();
      if (mode === 'full') {
        setPhase('transcripts');
        setProgress({ loaded: 0, total: exportLeads.length });

        const jobs = exportLeads
          .map((lead) => ({
            callId: lead.call_id,
            url: lead.enhanced_transcript_url || lead.transcript_url || '',
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
              console.warn(`[HotLeadsExport] transcript fetch failed for ${job.callId}:`, err);
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

      const rows = exportLeads.map((lead) => {
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
      const csv = `﻿${CSV_FIELDS.join(',')}\n${rows.join('\n')}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `hot-leads_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Exported ${rows.length.toLocaleString()} hot lead${rows.length === 1 ? '' : 's'}`
        + (mode === 'fast' ? ' (fast — no transcripts/recordings).' : '.'),
      );
      if (truncated) {
        toast.warning(
          `Export capped at ${rows.length.toLocaleString()} leads. Narrow the filters to export the rest.`,
        );
      }
      setOpen(false);
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
            recording links — slower on large ranges. <strong>Fast Export</strong> skips those and
            returns quickly with direction, analytics and all other fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="rounded-md border border-border/40 bg-muted/20 px-4 py-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ready to export
              </div>
              <div className="text-xl font-medium tracking-tight">
                {previewCount.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-2">
                  {canExportAll ? 'matching hot leads' : 'hot leads on this page'}
                </span>
              </div>
              {canExportAll && previewCount > EXPORT_MAX_ROWS && (
                <p className="text-[11px] text-orange-500 pt-1">
                  Only the first {EXPORT_MAX_ROWS.toLocaleString()} will be exported. Narrow the
                  filters to export a specific slice.
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
