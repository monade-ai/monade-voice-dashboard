'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Phone,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';

import { useDashboardData } from '@/app/hooks/use-dashboard-data';
import { useCredits } from '@/app/hooks/use-credits';
import { useTranscripts, Transcript } from '@/app/hooks/use-transcripts';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Helper to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Transcript Row Component
const TranscriptRow = ({ transcript, onView }: { transcript: Transcript; onView: () => void }) => {
  return (
    <tr className="group border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-4 px-4">
        <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{transcript.phone_number}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{transcript.call_id.substring(0, 8)}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <Badge variant="outline" className="rounded-[2px] bg-green-500/5 text-green-600 border-green-500/20 text-[10px] px-1.5 py-0 font-medium">
          COMPLETED
        </Badge>
      </td>
      <td className="py-4 px-4 text-xs text-muted-foreground">{formatDate(transcript.created_at)}</td>
      <td className="py-4 px-4 text-right">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[#facc15] transition-colors"
        >
          View Transcript
          <ExternalLink className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);
  const callsPerPage = 7;

  const { metrics, loading } = useDashboardData();
  const { credits } = useCredits();
  const { transcripts, loading: transcriptsLoading } = useTranscripts();

  const filteredTranscripts = showConnectedOnly
    ? transcripts.filter(t => t.has_conversation === true)
    : transcripts;
    
  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentTranscripts = filteredTranscripts.slice(indexOfFirstCall, indexOfLastCall);
  const totalPages = Math.ceil(filteredTranscripts.length / callsPerPage);

  const walletBalance = credits?.available_credits || 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        
        <DashboardHeader />

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-12">
          
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#facc15]">Active Intelligence</p>
                <h1 className="text-4xl font-medium tracking-tight">Enterprise Overview</h1>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
                    Export Report
                    <ArrowUpRight className="w-3 h-3" />
                </Button>
            </div>
          </div>

          {/* Key Metrics Grid - Using Paper Cards for the 'Printed' feel */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PaperCard className="relative group">
                <PaperCardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <PaperCardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Agents</PaperCardTitle>
                        <Users className="w-4 h-4 text-[#facc15]" />
                    </div>
                </PaperCardHeader>
                <PaperCardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-medium tracking-tight">{metrics?.agents?.total || 0}</span>
                        <span className="text-xs text-green-500 font-medium">+2 this week</span>
                    </div>
                </PaperCardContent>
            </PaperCard>

            <PaperCard>
                <PaperCardHeader className="pb-2">
                     <div className="flex items-center justify-between">
                        <PaperCardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Calls</PaperCardTitle>
                        <Phone className="w-4 h-4 text-[#facc15]" />
                    </div>
                </PaperCardHeader>
                <PaperCardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-medium tracking-tight">{transcripts.length}</span>
                        <span className="text-xs text-muted-foreground font-medium">Across all campaigns</span>
                    </div>
                </PaperCardContent>
            </PaperCard>

            <PaperCard>
                <PaperCardHeader className="pb-2">
                     <div className="flex items-center justify-between">
                        <PaperCardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Available Credits</PaperCardTitle>
                        <TrendingUp className="w-4 h-4 text-[#facc15]" />
                    </div>
                </PaperCardHeader>
                <PaperCardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-medium tracking-tight">{Math.round(walletBalance).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground font-medium">Minutes left</span>
                    </div>
                </PaperCardContent>
            </PaperCard>
          </section>

          {/* Logs / Activity Table */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium tracking-tight">Recent Activity</h3>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-[10px] rounded-[2px]">{filteredTranscripts.length}</Badge>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => { setShowConnectedOnly(!showConnectedOnly); setCurrentPage(1); }}
                        className={`text-xs font-medium transition-colors ${showConnectedOnly ? 'text-[#facc15]' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {showConnectedOnly ? 'Showing Connected Only' : 'Show Connected Only'}
                    </button>
                    <Separator orientation="vertical" className="h-4" />
                    <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">View All</button>
                </div>
            </div>

            <div className="border border-border rounded-md overflow-hidden bg-card/30 backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="py-3 px-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Source</th>
                      <th className="py-3 px-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Timestamp</th>
                      <th className="py-3 px-4 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transcriptsLoading ? (
                      <tr><td colSpan={4} className="py-20 text-center text-xs text-muted-foreground animate-pulse uppercase tracking-widest">Hydrating Logs...</td></tr>
                    ) : currentTranscripts.length === 0 ? (
                      <tr><td colSpan={4} className="py-20 text-center text-xs text-muted-foreground uppercase tracking-widest">No Signal Detected</td></tr>
                    ) : (
                      currentTranscripts.map((transcript) => (
                        <TranscriptRow
                          key={transcript.id}
                          transcript={transcript}
                          onView={() => setSelectedTranscript(transcript)}
                        />
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-muted/20">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      OFFSET {indexOfFirstCall + 1} — {Math.min(indexOfLastCall, transcripts.length)}
                    </span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setCurrentPage((p) => p - 1)}
                        disabled={currentPage === 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono font-medium">
                        PAGE {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={currentPage >= totalPages}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </section>

        </main>
      </div>

      {/* Transcript Viewer Modal */}
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