'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
} from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Transcript } from '@/app/hooks/use-transcripts';
import { useUserAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';

import { CallHistoryFilterBar, CallHistoryFilterState } from './components/call-history-filter-bar';
import { CallHistoryRow } from './components/call-history-row';
import { ExportCsvDialog } from './components/export-csv-dialog';

interface MergedTranscript extends Transcript {
  analytics?: CallAnalytics;
}

export default function CallHistoryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTranscript, setSelectedTranscript] = useState<MergedTranscript | null>(null);
  const [filters, setFilters] = useState<CallHistoryFilterState>({
    verdicts: [],
    qualities: [],
    hasConversation: false,
    search: '',
    timeRange: 'all',
    durationRange: 'all',
    campaigns: [],
    direction: 'all',
  });
  const callsPerPage = 10;

  const deferredSearch = useDeferredValue(filters.search);
  const {
    analytics: allAnalytics,
    pagination,
    loading: analyticsLoading,
    fetchPage: fetchAnalyticsPage,
  } = useUserAnalytics();

  const dateWindow = useMemo(() => {
    if (filters.timeRange === 'all') return {};

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (filters.timeRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (filters.timeRange === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (filters.timeRange === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (filters.timeRange === 'month') {
      start.setDate(start.getDate() - 30);
    }

    return { from: start.toISOString(), to: end.toISOString() };
  }, [filters.timeRange]);

  useEffect(() => {
    fetchAnalyticsPage({
      limit: callsPerPage,
      offset: (currentPage - 1) * callsPerPage,
      filters: {
        search: deferredSearch,
        verdicts: filters.verdicts,
        qualities: filters.qualities,
        campaignIds: filters.campaigns,
        direction: filters.direction,
        durationRange: filters.durationRange,
        ...dateWindow,
      },
    });
  }, [
    callsPerPage,
    currentPage,
    dateWindow,
    deferredSearch,
    fetchAnalyticsPage,
    filters.campaigns,
    filters.direction,
    filters.durationRange,
    filters.qualities,
    filters.verdicts,
  ]);

  // The call archive is backed by call_analytics. Each row already carries the
  // transcript URL, so the browser only needs the current bounded page.
  const mergedTranscripts = useMemo(() => {
    return allAnalytics.map((analytics): MergedTranscript => ({
      id: analytics.id ?? analytics.call_id,
      user_uid: analytics.user_uid ?? '',
      call_id: analytics.call_id,
      phone_number: analytics.phone_number ?? '',
      transcript_url: analytics.transcript_url ?? '',
      created_at: analytics.created_at ?? new Date().toISOString(),
      updated_at: analytics.updated_at ?? analytics.created_at ?? new Date().toISOString(),
      has_conversation: Boolean(analytics.summary || analytics.transcript_url),
      analytics,
    }));
  }, [allAnalytics]);

  // Get unique campaigns for filter from analytics-linked records.
  const availableCampaigns: string[] = useMemo(() => {
    const uniqueCampaigns = new Set<string>();
    mergedTranscripts.forEach((item) => {
      const campaignId = item.analytics?.campaign_id;
      if (typeof campaignId === 'string' && campaignId.trim()) {
        uniqueCampaigns.add(campaignId);
      }
    });

    return Array.from(uniqueCampaigns).sort();
  }, [mergedTranscripts]);

  // Calculate insights
  const insights = useMemo(() => {
    const total = pagination.total;
    const pageTotal = mergedTranscripts.length;
    const connected = mergedTranscripts.filter(t => t.has_conversation || t.analytics?.verdict !== 'no_answer').length;
    const avgDuration = mergedTranscripts.reduce((acc, t) => {
      const duration = typeof t.analytics?.key_discoveries?.duration_seconds === 'number' 
        ? t.analytics.key_discoveries.duration_seconds 
        : 0;

      return acc + duration;
    }, 0) / (pageTotal || 1);
    
    const successCount = mergedTranscripts.filter(t => {
      const verdict = t.analytics?.verdict?.toLowerCase() || '';

      return verdict.includes('interested') || verdict.includes('book') || verdict.includes('success');
    }).length;

    return {
      total,
      connected,
      connectionRate: pageTotal > 0 ? Math.round((connected / pageTotal) * 100) : 0,
      avgDuration: Math.round(avgDuration),
      successRate: pageTotal > 0 ? Math.round((successCount / pageTotal) * 100) : 0,
    };
  }, [mergedTranscripts, pagination.total]);

  const currentTranscripts = mergedTranscripts;
  const totalPages = Math.max(1, Math.ceil(pagination.total / callsPerPage));
  const firstRecord = pagination.total === 0 ? 0 : pagination.offset + 1;
  const lastRecord = pagination.offset + pagination.count;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <DashboardHeader />

        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-medium tracking-tight">Call Archive</h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                Your complete conversation history with AI-powered insights. Review call transcripts, 
                track engagement quality, and analyze outcomes. Filter by time, verdict, or connection 
                status to find exactly what you need.
              </p>
            </div>
            <div className="flex gap-3">
              <ExportCsvDialog calls={mergedTranscripts} />
            </div>
          </div>

          {/* Insights Cards */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <PaperCard
              shaderProps={{
                colors: ['#ffffff', '#f3f4f6', '#b1aa91', '#facc15'],
                positions: 42,
                waveX: 0.45,
                waveY: 1,
                grainMixer: 0.45,
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Total Calls</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <span className="text-6xl font-medium tracking-tighter leading-none">{insights.total}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37] dark:text-[#facc15] mt-4">Matching records</span>
                </div>
              </PaperCardContent>
            </PaperCard>

            <PaperCard
              shaderProps={{
                colors: ['#ffffff', '#f9fafb', '#e5e7eb', '#22c55e'],
                positions: 60,
                waveX: 0.8,
                waveY: 0.3,
                mixing: 0.1,
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Connection Rate</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-medium tracking-tighter leading-none">{insights.connectionRate}</span>
                    <span className="text-2xl text-muted-foreground">%</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-500 mt-4">{insights.connected} on this page</span>
                </div>
              </PaperCardContent>
            </PaperCard>

            <PaperCard
              shaderProps={{
                colors: ['#ffffff', '#f9fafb', '#e5e7eb', '#3b82f6'],
                positions: 50,
                waveX: 0.5,
                waveY: 0.5,
                mixing: 0.15,
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Avg Duration</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <span className="text-6xl font-medium tracking-tighter leading-none">{formatDuration(insights.avgDuration)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mt-4">Current page average</span>
                </div>
              </PaperCardContent>
            </PaperCard>

            <PaperCard
              shaderProps={{
                colors: ['#ffffff', '#f3f4f6', '#b1aa91', '#000000'],
                positions: 20,
                waveX: 0.2,
                waveY: 0.2,
                grainOverlay: 0.9,
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Success Rate</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-medium tracking-tighter leading-none">{insights.successRate}</span>
                    <span className="text-2xl text-muted-foreground">%</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4">Current page outcomes</span>
                </div>
              </PaperCardContent>
            </PaperCard>
          </section>

          {/* Call Ledger */}
          <section className="space-y-6 pb-20">
            <div className="flex flex-col gap-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-medium tracking-tight">Call Ledger</h3>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border-border text-muted-foreground uppercase tracking-widest font-mono">
                    {pagination.total} Records
                  </Badge>
                </div>
              </div>

              <CallHistoryFilterBar
                filters={filters}
                onFilterChange={(newFilters) => {
                  setCurrentPage(1);
                  setFilters(newFilters);
                }}
                availableCampaigns={availableCampaigns}
              />
            </div>

            <div className="overflow-hidden">
              {/* On mobile the fixed-width table can't shrink to fit; scroll it
                  horizontally instead of clipping the right-side Actions column.
                  Desktop container is wide enough that no scrollbar appears. */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[25%]">Lead Identity</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[20%]">Interaction</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[30%]">AI Analysis</th>
                      <th className="py-4 px-6 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[25%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {analyticsLoading ? (
                      <tr>
                        <td colSpan={4} className="py-24 text-center text-[11px] font-bold uppercase tracking-[0.6em] text-muted-foreground/20 animate-pulse">
                        Synchronizing Data...
                        </td>
                      </tr>
                    ) : currentTranscripts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <Phone className="w-12 h-12 text-muted-foreground/20" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                            No calls match your filters
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentTranscripts.map((item) => (
                        <CallHistoryRow
                          key={item.id}
                          transcript={item}
                          analytics={item.analytics}
                          onView={() => setSelectedTranscript(item)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-8 flex items-center justify-between border-t border-border/20">
                  <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                    Records {firstRecord} to {lastRecord} of {pagination.total}
                  </span>
                  <div className="flex items-center gap-10">
                    <button
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                      className="text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.3em]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= totalPages}
                      className="text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

        </main>
      </div>

      {selectedTranscript && (
        <TranscriptViewer
          transcriptUrl={selectedTranscript.transcript_url}
          callId={selectedTranscript.call_id}
          onClose={() => setSelectedTranscript(null)}
          initialAnalytics={selectedTranscript.analytics}
        />
      )}
    </ErrorBoundary>
  );
}
