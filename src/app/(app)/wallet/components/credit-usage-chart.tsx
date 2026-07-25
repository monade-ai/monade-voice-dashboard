'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Loader2, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fetchAllUserAnalytics } from '@/app/hooks/use-analytics';
import { resolveCallDirection } from '@/lib/utils/call-outcome';
import { PaperCard } from '@/components/ui/paper-card';
import { cn } from '@/lib/utils';

// A day-level chart doesn't need the full export cap; keep a heavy account from
// pulling its whole history into the browser just to draw bars.
const CHART_MAX_ROWS = 20_000;

// The chart buckets on India time, matching the wallet ledger elsewhere on this
// page (which formats in Asia/Kolkata). Credits are an INR-denominated,
// India-operated product, so "per day" means an IST calendar day.
const DISPLAY_TIME_ZONE = 'Asia/Kolkata';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
] as const;

type DirectionKey = 'inbound' | 'outbound' | 'unattributed';

interface DayBucket {
  // key: IST calendar day (YYYY-MM-DD); label: "26 Jul"
  key: string;
  label: string;
  inbound: number;
  outbound: number;
  unattributed: number;
  total: number;
}

const SERIES: { key: DirectionKey; label: string; cssVar: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'inbound', label: 'Inbound', cssVar: 'var(--credit-inbound)', Icon: PhoneIncoming },
  { key: 'outbound', label: 'Outbound', cssVar: 'var(--credit-outbound)', Icon: PhoneOutgoing },
  { key: 'unattributed', label: 'Unattributed', cssVar: 'var(--credit-unattributed)', Icon: BarChart3 },
];

// IST calendar-day key (YYYY-MM-DD) for an instant. en-CA yields ISO-ordered parts.
const istDayKey = (date: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

const istDayLabel = (date: Date): string => new Intl.DateTimeFormat('en-IN', {
  timeZone: DISPLAY_TIME_ZONE,
  day: 'numeric',
  month: 'short',
}).format(date);

const formatCredits = (value: number): string => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;

  return value % 1 === 0 ? String(value) : value.toFixed(1);
};

export function CreditUsageChart({ userUid }: { userUid: string | null }) {
  const [days, setDays] = useState<number>(7);
  const [buckets, setBuckets] = useState<DayBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userUid) return;

    // Build the ordered list of IST days we intend to show, newest last.
    const now = new Date();
    const dayList: { key: string; label: string }[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 86_400_000);
      dayList.push({ key: istDayKey(d), label: istDayLabel(d) });
    }

    // Over-fetch by a day on the low end so calls near the earliest IST midnight
    // aren't clipped by the UTC `from` boundary; extra days are dropped on render.
    const from = new Date(now.getTime() - days * 86_400_000).toISOString();
    const to = now.toISOString();

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setTruncated(false);

    fetchAllUserAnalytics({
      userUid,
      filters: { from, to },
      signal: controller.signal,
      maxRows: CHART_MAX_ROWS,
    })
      .then(({ rows, truncated: wasTruncated }) => {
        const byDay = new Map<string, DayBucket>();
        dayList.forEach(({ key, label }) => {
          byDay.set(key, { key, label, inbound: 0, outbound: 0, unattributed: 0, total: 0 });
        });

        rows.forEach((row) => {
          const credits = row.billing_data?.credits_used;
          if (typeof credits !== 'number' || credits <= 0 || !row.created_at) return;

          const key = istDayKey(new Date(row.created_at));
          const bucket = byDay.get(key);
          if (!bucket) return; // outside the displayed window (over-fetch margin)

          const direction = resolveCallDirection(row);
          const slot: DirectionKey = direction === 'inbound'
            ? 'inbound'
            : direction === 'outbound' ? 'outbound' : 'unattributed';
          bucket[slot] += credits;
          bucket.total += credits;
        });

        setBuckets(dayList.map(({ key }) => byDay.get(key)!));
        setTruncated(wasTruncated);
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
        console.warn('[CreditUsageChart] failed to load usage:', err);
        setError(err instanceof Error ? err.message : 'Failed to load usage');
        setBuckets([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userUid, days]);

  const totals = useMemo(() => {
    return buckets.reduce(
      (acc, b) => {
        acc.inbound += b.inbound;
        acc.outbound += b.outbound;
        acc.unattributed += b.unattributed;
        acc.total += b.total;

        return acc;
      },
      { inbound: 0, outbound: 0, unattributed: 0, total: 0 },
    );
  }, [buckets]);

  const hasUnattributed = totals.unattributed > 0;
  const activeSeries = SERIES.filter((s) => s.key !== 'unattributed' || hasUnattributed);
  const hasData = totals.total > 0;
  const topSeriesKey = activeSeries[activeSeries.length - 1]?.key;

  return (
    <section
      className={cn(
        'space-y-4',
        // Palette validated for CVD + contrast in light and dark (dataviz skill).
        // Amber is identical in both modes; inbound blue brightens for dark.
        '[--credit-outbound:#d97706] [--credit-inbound:#2563eb] [--credit-unattributed:#6b7280]',
        'dark:[--credit-inbound:#3b82f6]',
      )}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
            Daily Credit Spend
          </h3>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>

        {/* Timeframe selector — one row above the chart. */}
        <div className="inline-flex rounded-full border border-border/50 bg-background/70 p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={cn(
                'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                days === r.days ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <PaperCard variant="default" className="bg-card/30">
        <div className="p-6 space-y-5">
          {/* Legend + range totals. Identity is never colour-alone: each series
              carries an icon and label. */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              {activeSeries.map(({ key, label, cssVar, Icon }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: cssVar }} />
                  <Icon size={11} className="text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {Math.round(totals[key]).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Net spend · {days}d
              </span>
              <span className="text-lg font-medium tracking-tight">
                {Math.round(totals.total).toLocaleString()} <span className="text-xs text-muted-foreground">cr</span>
              </span>
            </div>
          </div>

          <div className="h-[280px]">
            {error ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
              </div>
            ) : !hasData && !loading && Boolean(userUid) ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                  No credit spend in this window
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    stroke="#9ca3af"
                    interval="preserveStartEnd"
                    minTickGap={8}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    stroke="#9ca3af"
                    tickFormatter={formatCredits}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', fillOpacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0].payload as DayBucket;

                      return (
                        <div className="bg-background border border-border/40 p-3 rounded-md shadow-2xl min-w-[160px]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{row.label}</p>
                          <div className="space-y-1.5">
                            {activeSeries.map(({ key, label, cssVar }) => (
                              <div key={key} className="flex items-center justify-between gap-6">
                                <span className="flex items-center gap-2 text-xs text-foreground">
                                  <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: cssVar }} />
                                  {label}
                                </span>
                                <span className="text-xs font-mono font-bold text-foreground">
                                  {Math.round(row[key]).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between gap-6 border-t border-border/30 pt-1.5 mt-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</span>
                              <span className="text-xs font-mono font-bold text-primary">{Math.round(row.total).toLocaleString()} cr</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {activeSeries.map(({ key, label, cssVar }) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={label}
                      stackId="credits"
                      fill={cssVar}
                      // 2px surface-coloured gap between stacked fills (dataviz mark spec).
                      stroke="var(--card)"
                      strokeWidth={2}
                      radius={key === topSeriesKey ? [3, 3, 0, 0] : undefined}
                      isAnimationActive={false}
                      maxBarSize={48}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {truncated && (
            <p className="text-[10px] text-orange-500">
              Showing a partial window — this account has more than {CHART_MAX_ROWS.toLocaleString()} calls in
              range; older days may be undercounted. Pick a shorter timeframe for exact totals.
            </p>
          )}
        </div>
      </PaperCard>
    </section>
  );
}
