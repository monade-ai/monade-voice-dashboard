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
import type { Transcript } from '@/app/hooks/use-transcripts';
import type { CallAnalytics } from '@/app/hooks/use-analytics';

export interface ExportableCall extends Transcript {
  analytics?: CallAnalytics;
}

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




export function ExportCsvDialog({ calls, trigger }: ExportCsvDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // The dialog used to carry its own date/direction/verdict filters. Those made
  // sense when the page held the whole archive and the dialog was the only place
  // to narrow an export. The archive is now filtered and paginated server-side,
  // so the filter bar on the page has already produced this exact set of rows —
  // re-offering the same controls here could only subtract from the page the
  // user is looking at, which reads as the export silently dropping records.
  //
  // Export therefore means "the rows currently on screen". A genuine
  // archive-wide export needs a streamed server-side job; walking every API page
  // in the browser is the pattern the pagination work exists to remove.
  const exportCalls = calls;

  // mode 'fast' skips the per-call transcript-text fetch (the only slow step) and exports
  // instantly with every column except the fetched Transcript text (URLs still included).
  // mode 'full' fetches transcript text for each call — accurate but slow on large ranges.
  const handleDownload = async (mode: 'fast' | 'full') => {
    if (exportCalls.length === 0 || exporting) {
      if (exportCalls.length === 0) toast.error('There are no records on this page to export.');

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
        const jobs = exportCalls
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
      a.download = `call-archive-page_${stamp}.csv`;
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
            Export Page
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Export Current Page to CSV
          </DialogTitle>
          <DialogDescription>
            Exports the archive page you are currently viewing, with whatever filters the page
            has applied. <strong>Full Export</strong> includes the full transcript (enhanced when
            available) and recording URL. <strong>Fast Export</strong> skips those and returns
            instantly with call IDs, verdicts, analytics and billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preview */}
          <section className="rounded-md border border-border/40 bg-muted/20 px-4 py-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ready to export
              </div>
              <div className="text-xl font-medium tracking-tight">
                {exportCalls.length.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-2">
                  records on this page
                </span>
              </div>
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
                disabled={exportCalls.length === 0}
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
                disabled={exportCalls.length === 0}
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
