'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** ISO-8601 (UTC) window sent to the analytics `from` / `to` filters. */
export interface ExportDateRange {
  from?: string;
  to?: string;
}

type RangePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom';

const PRESETS: { label: string; value: Exclude<RangePreset, 'custom'> }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
];

const startOfLocalDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfLocalDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// Date → "YYYY-MM-DDTHH:mm" in the browser's local zone, for a datetime-local input.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A datetime-local string carries no zone; new Date() reads it as local time and
// toISOString() converts to UTC — so the window the user sees in their own clock
// is what the backend filters on.
function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;

  return d.toISOString();
}

/**
 * Date/time window control for the CSV export dialogs.
 *
 * Since export now walks the server, this range is a real server-side filter on
 * `created_at`, layered on top of the page's active filters — not a client-side
 * pass over the loaded page. Presets snap to local-day boundaries; the custom
 * inputs give minute precision. All times are the viewer's local zone, stated
 * explicitly so there's no ambiguity about what a picked time means.
 */
export function ExportDateRangeField({
  onChange,
  disabled,
}: {
  onChange: (range: ExportDateRange) => void;
  disabled?: boolean;
}) {
  const [preset, setPreset] = useState<RangePreset>('all');
  const [fromLocal, setFromLocal] = useState('');
  const [toLocal, setToLocal] = useState('');

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  const emit = useCallback((from: string, to: string) => {
    onChange({ from: localInputToIso(from), to: localInputToIso(to) });
  }, [onChange]);

  const applyPreset = useCallback((p: Exclude<RangePreset, 'custom'>) => {
    setPreset(p);
    if (p === 'all') {
      setFromLocal('');
      setToLocal('');
      emit('', '');

      return;
    }

    const now = new Date();
    let start = startOfLocalDay(now);
    let end = endOfLocalDay(now);
    if (p === 'today') {
      end = now;
    } else if (p === 'yesterday') {
      start = startOfLocalDay(new Date(now.getTime() - 86_400_000));
      end = endOfLocalDay(new Date(now.getTime() - 86_400_000));
    } else if (p === '7d') {
      start = startOfLocalDay(new Date(now.getTime() - 6 * 86_400_000));
      end = now;
    } else if (p === '30d') {
      start = startOfLocalDay(new Date(now.getTime() - 29 * 86_400_000));
      end = now;
    }

    const fromStr = toLocalInput(start);
    const toStr = toLocalInput(end);
    setFromLocal(fromStr);
    setToLocal(toStr);
    emit(fromStr, toStr);
  }, [emit]);

  const handleFromChange = (value: string) => {
    setPreset('custom');
    setFromLocal(value);
    emit(value, toLocal);
  };

  const handleToChange = (value: string) => {
    setPreset('custom');
    setToLocal(value);
    emit(fromLocal, value);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3" />
          Date &amp; Time Range
        </Label>
        {timeZone && (
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">
            {timeZone.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
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

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <Label htmlFor="export-from" className="text-[10px] uppercase tracking-widest text-muted-foreground">
            From
          </Label>
          <Input
            id="export-from"
            type="datetime-local"
            value={fromLocal}
            max={toLocal || undefined}
            disabled={disabled}
            onChange={(e) => handleFromChange(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="export-to" className="text-[10px] uppercase tracking-widest text-muted-foreground">
            To
          </Label>
          <Input
            id="export-to"
            type="datetime-local"
            value={toLocal}
            min={fromLocal || undefined}
            disabled={disabled}
            onChange={(e) => handleToChange(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>
    </section>
  );
}
