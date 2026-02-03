'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Clock,
  MessageSquare,
  Activity,
  Play,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useDashboardData } from '@/app/hooks/use-dashboard-data';
import { useCredits } from '@/app/hooks/use-credits';
import { useTranscripts, Transcript } from '@/app/hooks/use-transcripts';
import { useUserAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { LeadIcon } from '@/components/ui/lead-icon';
import { cn } from '@/lib/utils';
import { FilterBar, FilterState } from './components/filter-bar';

// --- Helpers ---

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "It's late! Hope you're having a good night";
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Component: TranscriptRow (Strict Real Data) ---

const TranscriptRow = ({
  transcript,
  analytics,
  onView
}: {
  transcript: Transcript;
  analytics?: CallAnalytics;
  onView: () => void
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const isEngaged = transcript.has_conversation || (analytics && analytics.verdict !== 'no_answer');
  const verdict = analytics?.verdict ? analytics.verdict.replace('_', ' ') : (isEngaged ? "Conversation" : "No Answer");
  const summary = analytics?.summary || (isEngaged ? "Call transcript available for review." : "No interaction recorded.");
  const quality = analytics?.call_quality || "N/A";

  return (
    <tr
      className={cn(
        "group border-b border-border/40 transition-all duration-300",
        isEngaged ? "bg-[#facc15]/[0.02] hover:bg-[#facc15]/[0.05]" : "hover:bg-muted/30"
      )}
    >
      {/* 1. Lead Identity (Who) */}
      <td className="py-3 px-6">
        <div className="flex items-center gap-3">
          <LeadIcon seed={transcript.call_id} size={28} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground tracking-tight selection:bg-primary selection:text-black">
              {transcript.phone_number}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              ID: {transcript.call_id.substring(0, 8)}
            </span>
          </div>
        </div>
      </td>

      {/* 2. Interaction (Real Time) */}
      <td className="py-3 px-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {getRelativeTime(transcript.created_at)}
            </span>
          </div>
          {isEngaged && (
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-primary/60" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {quality}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* 3. Progress (Real AI Analysis) */}
      <td className="py-3 px-6">
        <div className="flex flex-col gap-1 max-w-[300px]">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isEngaged ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-muted-foreground/20"
            )} />
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest",
              isEngaged ? "text-foreground" : "text-muted-foreground/50"
            )}>
              {verdict}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1 italic leading-relaxed">
            "{summary}"
          </p>
        </div>
      </td>

      {/* 4. Action (Professional) */}
      <td className="py-3 px-6 text-right">
        <div className="flex items-center justify-end gap-3 transition-all duration-200">
          {isEngaged && (
            <motion.div
              layout
              initial={{ opacity: 0, x: 10 }}
              whileHover={{ opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="opacity-0 group-hover:opacity-100 flex items-center"
            >
              <motion.button
                layout
                onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                className={cn(
                  "h-7 flex items-center bg-foreground text-background font-bold tracking-widest overflow-hidden transition-all duration-500 rounded-full",
                  isPlaying ? "px-3 gap-3 w-48" : "px-3 gap-2 w-auto"
                )}
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                  {!isPlaying && <span className="text-[9px] uppercase">3:42</span>}
                </div>

                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex items-center gap-2"
                  >
                    <div className="flex-1 h-1 bg-background/20 rounded-full relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "35%" }}
                        className="absolute inset-y-0 left-0 bg-background"
                      />
                    </div>
                    <span className="text-[8px] font-mono tabular-nums opacity-60">1:12</span>
                  </motion.div>
                )}
              </motion.button>
            </motion.div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="opacity-0 group-hover:opacity-100 h-7 px-4 rounded-[4px] bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
          >
            Details
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Placeholder for Action when not hovering */}
        <div className="group-hover:hidden flex items-center justify-end">
          <MessageSquare size={14} className="text-muted-foreground/60 transition-colors" />
        </div>
      </td>
    </tr>
  );
};

// --- Page Component ---

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Hi!");
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    verdicts: [],
    qualities: [],
    hasConversation: false,
    search: '',
    timeRange: 'all',
  });
  const callsPerPage = 10;

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const { metrics } = useDashboardData();
  const { credits } = useCredits();
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
      analytics: allAnalytics.find(a => a.call_id === t.call_id)
    }));
  }, [transcripts, allAnalytics]);

  const filteredTranscripts = useMemo(() => {
    return mergedTranscripts.filter(t => {
      // 1. Engaged Only
      if (filters.hasConversation && !(t.has_conversation || t.analytics)) return false;

      // 2. Verdicts
      if (filters.verdicts.length > 0) {
        const verdict = t.analytics?.verdict || (t.has_conversation ? "conversation" : "no_answer");
        if (!filters.verdicts.includes(verdict)) return false;
      }

      // 3. Qualities
      if (filters.qualities.length > 0) {
        const quality = t.analytics?.call_quality;
        if (!quality || !filters.qualities.includes(quality)) return false;
      }

      // 4. Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesPhone = t.phone_number.toLowerCase().includes(searchLower);
        const matchesId = t.call_id.toLowerCase().includes(searchLower);
        const matchesSummary = t.analytics?.summary?.toLowerCase().includes(searchLower);
        if (!matchesPhone && !matchesId && !matchesSummary) return false;
      }

      // 5. Time Range
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
        }
      }

      return true;
    });
  }, [mergedTranscripts, filters]);

  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentTranscripts = filteredTranscripts.slice(indexOfFirstCall, indexOfLastCall);
  const totalPages = Math.ceil(filteredTranscripts.length / callsPerPage);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col font-sans">

        <DashboardHeader />

        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-3xl font-medium tracking-tight">{greeting}, Friend.</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">Performance insights and real-time activity log.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="gap-2 h-9 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-[#facc15] hover:border-[#facc15] hover:text-black transition-all">
                Export Archive
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PaperCard
              shaderProps={{
                colors: ["#ffffff", "#f3f4f6", "#b1aa91", "#facc15"],
                positions: 42,
                waveX: 0.45,
                waveY: 1,
                grainMixer: 0.45
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Active Agents</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <span className="text-6xl font-medium tracking-tighter leading-none">{metrics?.agents?.total || 0}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37] dark:text-[#facc15] mt-4">Capacity: {metrics?.agents?.active || 0} online</span>
                </div>
              </PaperCardContent>
            </PaperCard>

            <PaperCard
              shaderProps={{
                colors: ["#ffffff", "#f9fafb", "#e5e7eb", "#8e8c15"],
                positions: 60,
                waveX: 0.8,
                waveY: 0.3,
                mixing: 0.1
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Interaction Count</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <span className="text-6xl font-medium tracking-tighter leading-none">{transcripts.length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4">Calls processed today</span>
                </div>
              </PaperCardContent>
            </PaperCard>

            <PaperCard
              shaderProps={{
                colors: ["#ffffff", "#f3f4f6", "#b1aa91", "#000000"],
                positions: 20,
                waveX: 0.2,
                waveY: 0.2,
                grainOverlay: 0.9
              }}
            >
              <PaperCardHeader>
                <PaperCardTitle>Account Credits</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="mt-4">
                <div className="flex flex-col">
                  <span className="text-6xl font-medium tracking-tighter leading-none">
                    {Math.round(credits?.available_credits || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4">Minutes remaining</span>
                </div>
              </PaperCardContent>
            </PaperCard>
          </section>

          <section className="space-y-6 pb-20">
            <div className="flex flex-col gap-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-medium tracking-tight">Lead Ledger</h3>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border-border text-muted-foreground uppercase tracking-widest font-mono">
                    {filteredTranscripts.length} Active Signals
                  </Badge>
                </div>
              </div>

              <FilterBar
                filters={filters}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/20">
                    <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Lead Identity</th>
                    <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Interaction</th>
                    <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">AI Analysis</th>
                    <th className="py-4 px-6 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {transcriptsLoading ? (
                    <tr><td colSpan={4} className="py-24 text-center text-[11px] font-bold uppercase tracking-[0.6em] text-muted-foreground/20 animate-pulse">Synchronizing Data...</td></tr>
                  ) : (
                    currentTranscripts.map((item) => (
                      <TranscriptRow
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
                    Records {indexOfFirstCall + 1} to {Math.min(indexOfLastCall, transcripts.length)}
                  </span>
                  <div className="flex items-center gap-10">
                    <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1} className="text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors">
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.3em]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage >= totalPages} className="text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors">
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
