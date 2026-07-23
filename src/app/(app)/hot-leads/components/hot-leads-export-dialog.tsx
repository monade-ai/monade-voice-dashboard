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
import type { CallAnalytics } from '@/app/hooks/use-analytics';

interface HotLeadsExportDialogProps {
  /** The curated hot-leads list (already filtered by the page's search/intent/confidence). */
  leads: CallAnalytics[];
  trigger?: React.ReactNode;
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

export function HotLeadsExportDialog({ leads, trigger }: HotLeadsExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // The Deal Room is filtered and paginated server-side now, so this dialog's
  // own date range could only subtract from the page already on screen — the
  // same filter applied twice, reading as the export dropping records. Export
  // means "the leads currently on screen"; an archive-wide export needs a
  // streamed server-side job rather than the browser walking every page.
  const exportLeads = leads;

  const handleDownload = async (mode: 'fast' | 'full') => {
    if (exportLeads.length === 0 || exporting) {
      if (exportLeads.length === 0) toast.error('There are no hot leads on this page to export.');

      return;
    }
    setExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // Fetch transcript text only for the leads being exported, preferring the enhanced
      // transcript. Bounded concurrency so a large range doesn't fire hundreds of requests.
      // Skipped entirely in 'fast' mode.
      const transcriptByCallId = new Map<string, string>();
      if (mode === 'full') {
        const jobs = exportLeads
          .map((lead) => ({
            callId: lead.call_id,
            url: lead.enhanced_transcript_url || lead.transcript_url || '',
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
              console.warn(`[HotLeadsExport] transcript fetch failed for ${job.callId}:`, err);
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
      setOpen(false);
    } catch (err) {
      if (signal.aborted) {
        toast.info('Export cancelled.');
      } else {
        console.error('[HotLeadsExport] Failed:', err);
        toast.error('Failed to export hot leads.');
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
          >
            <Download size={14} />
            Export Page
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Export Current Hot Leads Page
          </DialogTitle>
          <DialogDescription>
            Exports the Deal Room page you are currently viewing, with whatever filters the page
            has applied. <strong>Full Export</strong> includes transcripts (enhanced when
            available) and recording links. <strong>Fast Export</strong> skips those and returns
            instantly with direction, analytics and all other fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="rounded-md border border-border/40 bg-muted/20 px-4 py-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ready to export
              </div>
              <div className="text-xl font-medium tracking-tight">
                {exportLeads.length.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-2">
                  hot leads on this page
                </span>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-widest">
              Cancel
            </Button>
          </DialogClose>
          {exporting ? (
            // While exporting: show progress + an inline cross to abort the in-flight job.
            <div className="flex items-stretch rounded-md overflow-hidden bg-foreground text-background">
              <div className="flex items-center gap-2 pl-3 pr-2 text-[10px] font-bold uppercase tracking-widest">
                <Loader2 className="w-3 h-3 animate-spin" />
                Exporting…
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
                disabled={exportLeads.length === 0}
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
                disabled={exportLeads.length === 0}
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
