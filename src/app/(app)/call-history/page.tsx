'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Phone,
  Download,
} from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useTranscripts, Transcript } from '@/app/hooks/use-transcripts';
import { useUserAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';
import { cn } from '@/lib/utils';

import { CallHistoryFilterBar, CallHistoryFilterState } from './components/call-history-filter-bar';
import { CallHistoryRow } from './components/call-history-row';

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
  });
  const callsPerPage = 10;

  const { transcripts, loading: transcriptsLoading } = useTranscripts();
  const { analytics: allAnalytics, fetchAll: fetchAnalytics } = useUserAnalytics();

  useEffect(() => {
    if (transcripts.length > 0) {
      fetchAnalytics();
    }
  }, [transcripts.length, fetchAnalytics]);

  const mergedTranscripts = useMemo(() => {
    return transcripts.map(t => ({
      ...t,
      analytics: allAnalytics.find(a => a.call_id === t.call_id),
    }));
  }, [transcripts, allAnalytics]);

  // Get unique campaigns for filter (disabled - campaign_id not in transcript type)
  const availableCampaigns: string[] = useMemo(() => {
    // TODO: Add campaign_id to Transcript type when API supports it
    return [];
  }, []);

  // Calculate insights
  const insights = useMemo(() => {
    const total = mergedTranscripts.length;
    const connected = mergedTranscripts.filter(t => t.has_conversation || t.analytics?.verdict !== 'no_answer').length;
    const avgDuration = mergedTranscripts.reduce((acc, t) => {
      const duration = typeof t.analytics?.key_discoveries?.duration_seconds === 'number' 
        ? t.analytics.key_discoveries.duration_seconds 
        : 0;

      return acc + duration;
    }, 0) / (total || 1);
    
    const successCount = mergedTranscripts.filter(t => {
      const verdict = t.analytics?.verdict?.toLowerCase() || '';

      return verdict.includes('interested') || verdict.includes('book') || verdict.includes('success');
    }).length;

    return {
      total,
      connected,
      connectionRate: total > 0 ? Math.round((connected / total) * 100) : 0,
      avgDuration: Math.round(avgDuration),
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
    };
  }, [mergedTranscripts]);

  // Filter logic
  const filteredTranscripts = useMemo(() => {
    return mergedTranscripts.filter(t => {
      // 1. Connected Only
      if (filters.hasConversation && !(t.has_conversation || t.analytics)) return false;

      // 2. Verdicts
      if (filters.verdicts.length > 0) {
        const verdict = t.analytics?.verdict || (t.has_conversation ? 'conversation' : 'no_answer');
        if (!filters.verdicts.includes(verdict)) return false;
      }

      // 3. Qualities
      if (filters.qualities.length > 0) {
        const quality = t.analytics?.call_quality;
        if (!quality || !filters.qualities.includes(quality)) return false;
      }

      // 4. Duration Range
      if (filters.durationRange !== 'all') {
        const duration = typeof t.analytics?.key_discoveries?.duration_seconds === 'number' 
          ? t.analytics.key_discoveries.duration_seconds 
          : 0;
        if (filters.durationRange === 'short' && duration >= 60) return false;
        if (filters.durationRange === 'medium' && (duration < 60 || duration > 300)) return false;
        if (filters.durationRange === 'long' && duration <= 300) return false;
      }

      // 5. Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesPhone = t.phone_number.toLowerCase().includes(searchLower);
        const matchesId = t.call_id.toLowerCase().includes(searchLower);
        const matchesSummary = t.analytics?.summary?.toLowerCase().includes(searchLower);
        if (!matchesPhone && !matchesId && !matchesSummary) return false;
      }

      // 7. Time Range
      if (filters.timeRange !== 'all') {
        const createdAt = new Date(t.created_at);
        const now = new Date();
        if (filters.timeRange === 'today') {
          if (createdAt.toDateString() !== now.toDateString()) return false;
        } else if (filters.timeRange === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          if (createdAt.toDateString() !== yesterday.toDateString()) return false;
        } else if (filters.timeRange === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          if (createdAt < weekAgo) return false;
        } else if (filters.timeRange === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setDate(now.getDate() - 30);
          if (createdAt < monthAgo) return false;
        }
      }

      return true;
    });
  }, [mergedTranscripts, filters]);

  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentTranscripts = filteredTranscripts.slice(indexOfFirstCall, indexOfLastCall);
  const totalPages = Math.ceil(filteredTranscripts.length / callsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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
              <Button variant="outline" size="sm" className="gap-2 h-9 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-[#facc15] hover:border-[#facc15] hover:text-black transition-all">
                <Download className="w-3 h-3" />
                Export Archive
                <ArrowUpRight className="w-3 h-3" />
              </Button>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37] dark:text-[#facc15] mt-4">All time records</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-500 mt-4">{insights.connected} Connected</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mt-4">Minutes per call</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4">Positive outcomes</span>
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
                    {filteredTranscripts.length} Records
                  </Badge>
                </div>
              </div>

              <CallHistoryFilterBar
                filters={filters}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                }}
                availableCampaigns={availableCampaigns}
              />
            </div>

            <div className="overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[25%]">Lead Identity</th>
                    <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[20%]">Interaction</th>
                    <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[30%]">AI Analysis</th>
                    <th className="py-4 px-6 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 w-[25%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {transcriptsLoading ? (
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

              {totalPages > 1 && (
                <div className="px-6 py-8 flex items-center justify-between border-t border-border/20">
                  <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                    Records {indexOfFirstCall + 1} to {Math.min(indexOfLastCall, filteredTranscripts.length)} of {filteredTranscripts.length}
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
        />
      )}
    </ErrorBoundary>
  );
}
