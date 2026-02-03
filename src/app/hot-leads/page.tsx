'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  CalendarDays,
  Target,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useUserAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';
import { DashboardHeader } from '@/components/dashboard-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { LeadIcon } from '@/components/ui/lead-icon';
import { cn } from '@/lib/utils';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { HotLeadsGuide } from './components/hot-leads-guide';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// --- Helpers (Memoized externally or stable) ---

const getVerdictConfig = (verdict: string | undefined) => {
    if (!verdict) return { label: 'Unknown', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
    const v = verdict.toLowerCase();
    if (v.includes('book') || v.includes('success') || v.includes('demo')) return { label: 'Conversion', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
    if (v.includes('interest')) return { label: 'Qualified', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' };
    if (v.includes('callback')) return { label: 'Follow Up', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    return { label: 'Neutral', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
};

const formatCurrency = (val: string | undefined) => {
    if (!val) return null;
    return val.includes('$') || val.includes('₹') ? val : `₹${val}`;
};

// --- Component: DealRow (Memoized for Performance) ---

const DealRow = React.memo(({ lead, onClick }: { lead: CallAnalytics, onClick: () => void }) => {
    const config = getVerdictConfig(lead.verdict);
    const confidence = lead.confidence_score || 0;
    const price = formatCurrency(lead.key_discoveries?.price_quoted as string);
    const confidenceColor = confidence >= 80 ? "text-green-500" : confidence >= 50 ? "text-yellow-500" : "text-red-500";

    return (
        <div 
            onClick={onClick}
            className="group flex items-center justify-between p-5 border-b border-border/10 hover:bg-muted/30 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
            
            {/* 1. Lead Identity (30%) */}
            <div className="flex items-center gap-5 w-[30%]">
                <div className="shrink-0">
                    <LeadIcon seed={lead.call_id} size={40} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground tracking-tight">{lead.phone_number}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        {new Date(lead.created_at || Date.now()).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* 2. Intent & Confidence (25%) */}
            <div className="w-[25%] flex items-center gap-6">
                <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border", config.bg, config.border)}>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", config.color)}>{config.label}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-2 border-l border-border/40">
                    <span className={cn("text-xl font-mono font-bold leading-none", confidenceColor)}>{confidence}%</span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Match</span>
                </div>
            </div>

            {/* 3. Intelligence Snippet (25%) */}
            <div className="w-[25%] pr-6 border-l border-border/10 pl-6">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                    "{lead.summary}"
                </p>
            </div>

            {/* 4. Value & Action (20%) */}
            <div className="w-[20%] flex items-center justify-end gap-8">
                {price && (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Value</span>
                        <span className="text-base font-mono font-bold text-foreground">{price}</span>
                    </div>
                )}
                <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-sm">
                    <ArrowUpRight size={18} />
                </div>
            </div>
        </div>
    );
});
DealRow.displayName = 'DealRow';

// --- Main Page ---

export default function HotLeadsPage() {
  const { analytics: allAnalytics, loading, fetchAll } = useUserAnalytics();
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<CallAnalytics | null>(null);
  
  // Filter States
  const [intentFilter, setIntentFilter] = useState<'all' | 'booked' | 'interested' | 'callback'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high'>('all'); 
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Memoized Filter Logic (Heavy Calculation)
  const hotLeads = useMemo(() => {
    return allAnalytics.filter(a => {
        if ((a.confidence_score || 0) < 50) return false;
        const v = (a.verdict || '').toLowerCase();
        if (v.includes('not') || v.includes('failed') || v.includes('dnc') || v.includes('wrong')) return false;
        
        // Search
        if (search && !a.phone_number?.includes(search) && !a.summary?.toLowerCase().includes(search.toLowerCase())) return false;
        
        // Intent
        if (intentFilter === 'booked' && !(v.includes('book') || v.includes('success'))) return false;
        if (intentFilter === 'interested' && !v.includes('interest')) return false;
        if (intentFilter === 'callback' && !v.includes('callback')) return false;
        
        // Confidence
        if (confidenceFilter === 'high' && (a.confidence_score || 0) < 80) return false;
        
        // Date
        const leadDate = new Date(a.created_at || Date.now());
        const now = new Date();
        const diffDays = (now.getTime() - leadDate.getTime()) / (1000 * 3600 * 24);
        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
        
        return true;
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [allAnalytics, search, intentFilter, dateFilter, confidenceFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(hotLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return hotLeads.slice(start, start + itemsPerPage);
  }, [hotLeads, currentPage]);

  // Stats Logic (Memoized)
  const stats = useMemo(() => ({
    total: hotLeads.length,
    interested: hotLeads.filter(l => l.verdict?.includes('interest')).length,
    booked: hotLeads.filter(l => l.verdict?.includes('book') || l.verdict?.includes('success')).length,
    callbacks: hotLeads.filter(l => l.verdict?.includes('callback')).length
  }), [hotLeads]);

  // Handlers (Stabilized)
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(Math.min(Math.max(1, newPage), totalPages));
  }, [totalPages]);

  const handleSelectLead = useCallback((lead: CallAnalytics) => {
    setSelectedLead(lead);
  }, []);

  // Reset pagination on filter change
  useEffect(() => { setCurrentPage(1); }, [search, intentFilter, dateFilter, confidenceFilter]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Header Horizon */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
            <div className="space-y-2">
                <h1 className="text-5xl font-medium tracking-tighter text-foreground">Deal Room</h1>
                <p className="text-muted-foreground text-sm font-medium">High-value opportunities requiring priority handling.</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input 
                        placeholder="Search leads..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 w-64 bg-muted/10 border-border/40 text-xs focus:ring-primary transition-all rounded-md"
                    />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all min-w-[120px] justify-between">
                            <div className="flex items-center gap-2"><CalendarDays size={14} /> {dateFilter === 'all' ? 'All Time' : dateFilter === 'today' ? 'Today' : dateFilter === '7d' ? 'Last 7 Days' : 'Last 30 Days'}</div>
                            <ChevronDown size={12} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDateFilter('today')}>Today</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter('7d')}>Last 7 Days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter('30d')}>Last 30 Days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter('all')}>All Time</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 border-b border-border/20 pb-6 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">Target Intent:</span>
            <div className="flex gap-2">
                {['all', 'booked', 'interested', 'callback'].map((f) => (
                    <button 
                        key={f}
                        onClick={() => setIntentFilter(f as any)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                            intentFilter === f ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/50"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>
            <div className="h-4 w-px bg-border/40 mx-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Confidence:</span>
            <button 
                onClick={() => setConfidenceFilter(confidenceFilter === 'all' ? 'high' : 'all')}
                className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center gap-2",
                    confidenceFilter === 'high' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/50"
                )}
            >
                High-Match Only ({'>'}80%)
            </button>
        </div>

        {/* Pipeline Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PaperCard variant="default" className="bg-green-500/[0.02] border-green-500/20">
                <PaperCardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-green-600">Conversions</span>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold font-mono text-foreground">{stats.booked}</span>
                            <span className="text-xs text-muted-foreground">Booked</span>
                        </div>
                    </div>
                    <CheckCircle2 size={24} className="text-green-500 opacity-20" />
                </PaperCardContent>
            </PaperCard>

            <PaperCard variant="default" className="bg-primary/[0.02] border-primary/20">
                <PaperCardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Qualified</span>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold font-mono text-foreground">{stats.interested}</span>
                            <span className="text-xs text-muted-foreground">Interested</span>
                        </div>
                    </div>
                    <Target size={24} className="text-primary opacity-20" />
                </PaperCardContent>
            </PaperCard>

            <PaperCard variant="default" className="bg-orange-500/[0.02] border-orange-500/20">
                <PaperCardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">Pipeline</span>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold font-mono text-foreground">{stats.callbacks}</span>
                            <span className="text-xs text-muted-foreground">Follow-ups</span>
                        </div>
                    </div>
                    <Clock size={24} className="text-orange-500 opacity-20" />
                </PaperCardContent>
            </PaperCard>
        </div>

        {/* The Deal Ledger */}
        <section className="space-y-6 pb-32">
            <div className="bg-card rounded-md border border-border/20 overflow-hidden min-h-[400px] flex flex-col">
                
                {/* Table Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/20 bg-muted/5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[30%] pl-1">Lead Identity</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[25%]">Intent & Match</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[25%]">Intelligence Snippet</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 w-[20%] text-right pr-2">Opportunity Value</span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="animate-spin text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Deals...</span>
                    </div>
                ) : hotLeads.length === 0 ? (
                    <div className="py-32 text-center text-xs text-muted-foreground italic uppercase tracking-widest">
                        No opportunities match your current filters.
                    </div>
                ) : (
                    <div className="flex flex-col flex-1">
                        {paginatedLeads.map((lead) => (
                            <DealRow 
                                key={lead.call_id} 
                                lead={lead} 
                                onClick={() => handleSelectLead(lead)} 
                            />
                        ))}
                    </div>
                )}

                {/* Pagination Footer */}
                {hotLeads.length > 0 && (
                    <div className="p-4 border-t border-border/10 flex items-center justify-between bg-muted/5 mt-auto">
                        <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                            Page {currentPage} of {totalPages} ({hotLeads.length} Total)
                        </span>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)} 
                                disabled={currentPage === 1} 
                                className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                onClick={() => handlePageChange(currentPage + 1)} 
                                disabled={currentPage === totalPages} 
                                className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>

      </main>

      {selectedLead && selectedLead.transcript_url && selectedLead.call_id && (
        <TranscriptViewer
          transcriptUrl={selectedLead.transcript_url}
          callId={selectedLead.call_id}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}