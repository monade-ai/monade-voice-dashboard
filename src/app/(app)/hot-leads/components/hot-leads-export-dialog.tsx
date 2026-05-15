'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, FileDown, Loader2, X } from 'lucide-react';
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
import { resolveCallDirection } from '@/lib/utils/call-outcome';
import type { CallAnalytics } from '@/app/hooks/use-analytics';

type RangePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

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

// datetime-local string (no tz) ⇄ Date in the browser's local time.
function toDateTimeLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [preset, setPreset] = useState<RangePreset>('all');
  const [fromDateTime, setFromDateTime] = useState<string>('');
  const [toDateTime, setToDateTime] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    const now = new Date();
    if (p === 'all') {
      setFromDateTime('');
      setToDateTime('');
    } else if (p === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      setFromDateTime(toDateTimeLocalInput(start));
      setToDateTime(toDateTimeLocalInput(now));
    } else if (p === 'yesterday') {
      const start = new Date(now); start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setDate(now.getDate() - 1); end.setHours(23, 59, 0, 0);
      setFromDateTime(toDateTimeLocalInput(start));
      setToDateTime(toDateTimeLocalInput(end));
    } else if (p === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 7);
      setFromDateTime(toDateTimeLocalInput(start));
      setToDateTime(toDateTimeLocalInput(now));
    } else if (p === 'month') {
      const start = new Date(now); start.setDate(now.getDate() - 30);
      setFromDateTime(toDateTimeLocalInput(start));
      setToDateTime(toDateTimeLocalInput(now));
    }
    // 'custom' leaves the existing from/to as-is.
  };

  const filteredLeads = useMemo(() => {
    const fromTs = fromDateTime ? new Date(fromDateTime).getTime() : null;
    const toTs = toDateTime ? new Date(toDateTime).getTime() : null;

    return leads.filter((lead) => {
      const ms = leadDate(lead).getTime();
      if (fromTs !== null && !Number.isNaN(fromTs) && ms < fromTs) return false;
      if (toTs !== null && !Number.isNaN(toTs) && ms > toTs) return false;

      return true;
    });
  }, [leads, fromDateTime, toDateTime]);

  const handleDownload = async () => {
    if (filteredLeads.length === 0 || exporting) {
      if (filteredLeads.length === 0) toast.error('No hot leads match the selected range.');

      return;
    }
    setExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // Fetch transcript text only for the leads being exported, preferring the enhanced
      // transcript. Bounded concurrency so a large range doesn't fire hundreds of requests.
      const transcriptByCallId = new Map<string, string>();
      const jobs = filteredLeads
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

      const rows = filteredLeads.map((lead) => {
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
          lead.recording_url,
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

      toast.success(`Exported ${rows.length.toLocaleString()} hot lead${rows.length === 1 ? '' : 's'}.`);
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

  const resetFilters = () => {
    setPreset('all');
    setFromDateTime('');
    setToDateTime('');
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
    <Dialog open={open} onOpenChange={setOpen}>
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
            Choose a date &amp; time range so you only download the leads you need — not the
            entire Deal Room. Transcripts (enhanced when available), call direction, analytics
            and recording links are all included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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
                <Label htmlFor="hl-export-from" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  From
                </Label>
                <Input
                  id="hl-export-from"
                  type="datetime-local"
                  value={fromDateTime}
                  max={toDateTime || undefined}
                  onChange={(e) => { setFromDateTime(e.target.value); setPreset('custom'); }}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hl-export-to" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  To
                </Label>
                <Input
                  id="hl-export-to"
                  type="datetime-local"
                  value={toDateTime}
                  min={fromDateTime || undefined}
                  onChange={(e) => { setToDateTime(e.target.value); setPreset('custom'); }}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </section>

          <section className="rounded-md border border-border/40 bg-muted/20 px-4 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ready to export
              </div>
              <div className="text-xl font-medium tracking-tight">
                {filteredLeads.length.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-2">
                  of {leads.length.toLocaleString()} hot leads
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Reset
            </Button>
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
            <Button
              onClick={handleDownload}
              disabled={filteredLeads.length === 0}
              size="sm"
              className="gap-2 text-[10px] font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90"
            >
              <Download className="w-3 h-3" />
              Download CSV
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
