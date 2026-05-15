'use client';

import React, { useMemo, useState } from 'react';
import { Download, FileDown, Filter, X } from 'lucide-react';
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

const CSV_COLUMNS: { key: string; label: string; get: (c: ExportableCall) => unknown }[] = [
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

  const handleDownload = () => {
    if (filteredCalls.length === 0) {
      toast.error('No records match the selected filters.');

      return;
    }

    const header = CSV_COLUMNS.map(c => escapeCsv(c.label)).join(',');
    const rows = filteredCalls.map(call =>
      CSV_COLUMNS.map(col => escapeCsv(col.get(call))).join(','),
    );
    // Prepend BOM so Excel detects UTF-8 correctly.
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

    toast.success(`Exported ${filteredCalls.length.toLocaleString()} record${filteredCalls.length === 1 ? '' : 's'} to CSV.`);
    setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
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
            Choose a time range and optional filters. Transcripts are excluded; everything else
            (call IDs, phone numbers, verdicts, analytics, billing) is included.
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
          <Button
            onClick={handleDownload}
            disabled={filteredCalls.length === 0}
            size="sm"
            className="gap-2 text-[10px] font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90"
          >
            <Download className="w-3 h-3" />
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
