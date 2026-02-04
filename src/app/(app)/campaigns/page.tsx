'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Activity,
  Loader2,
  FolderOpen,
  Play,
  Pause,
  Square,
  Trash2,
  MoreVertical,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import {
  Campaign,
  CampaignStatus,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';
import { cn } from '@/lib/utils';

import { CreateCampaignModal } from './components/create-campaign-modal';
import { CampaignsGuide } from './components/campaigns-guide';

// --- Helpers ---

const getStatusColor = (status: CampaignStatus) => {
  switch (status) {
  case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
  case 'paused': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  case 'completed': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  case 'stopped': return 'text-red-500 bg-red-500/10 border-red-500/20';
  default: return 'text-muted-foreground bg-muted border-border/40';
  }
};

const getHumanStatus = (status: CampaignStatus, cps: number) => {
  switch (status) {
  case 'active': return `Dialing (${cps}/sec)`;
  case 'paused': return 'Halted';
  case 'pending': return 'Queued';
  case 'completed': return 'Finished';
  case 'stopped': return 'Terminated';
  default: return status;
  }
};

const calculateProgress = (c: Campaign) => {
  if (c.total_contacts === 0) return 0;
  const processed = c.successful_calls + c.failed_calls;

  return Math.min(100, Math.round((processed / c.total_contacts) * 100));
};

// --- Component: CampaignRow ---

const CampaignRow = ({ 
  campaign, 
  onStart, 
  onPause, 
  onStop, 
  onDelete, 
}: { 
  campaign: Campaign, 
  onStart: (c: Campaign) => void, 
  onPause: (c: Campaign) => void,
  onStop: (c: Campaign) => void,
  onDelete: (c: Campaign) => void
}) => {
  const progress = calculateProgress(campaign);
  const successRate = campaign.successful_calls + campaign.failed_calls > 0 
    ? Math.round((campaign.successful_calls / (campaign.successful_calls + campaign.failed_calls)) * 100) 
    : 0;

  return (
    <div className="group flex items-center justify-between p-4 border-b border-border/10 hover:bg-muted/30 transition-all">
      
      {/* 1. Identity */}
      <div className="flex flex-col w-[25%] min-w-[200px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-foreground truncate" title={campaign.name}>
            {campaign.name}
          </span>
          <Badge variant="outline" className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0 h-5', getStatusColor(campaign.status))}>
            {campaign.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock size={10} />
          <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* 2. Progress Bar */}
      <div className="flex flex-col w-[20%] gap-1.5">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Completion</span>
          <span className="text-[10px] font-mono font-bold text-foreground">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all duration-500', campaign.status === 'active' ? 'bg-green-500' : 'bg-foreground/40')} 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 3. Metrics */}
      <div className="flex flex-col w-[15%]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Success Rate</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-mono font-bold text-foreground">{successRate}%</span>
          <span className="text-[10px] text-muted-foreground">({campaign.successful_calls}/{campaign.total_contacts})</span>
        </div>
      </div>

      {/* 4. Configuration */}
      <div className="flex flex-col w-[15%]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Throttle</span>
        <span className="text-sm font-mono text-foreground">{campaign.calls_per_second} CPS</span>
      </div>

      {/* 5. Actions */}
      <div className="flex items-center justify-end gap-2 w-[15%]">
        {campaign.status === 'active' ? (
          <button onClick={() => onPause(campaign)} className="p-2 rounded-md bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors" title="Pause">
            <Pause size={14} fill="currentColor" />
          </button>
        ) : (
          <button onClick={() => onStart(campaign)} className="p-2 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors" title="Start">
            <Play size={14} fill="currentColor" />
          </button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <MoreVertical size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Campaign Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/campaigns/${campaign.id}`}>
                <FolderOpen className="mr-2 h-4 w-4" /> View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStop(campaign)} className="text-red-600">
              <Square className="mr-2 h-4 w-4" /> Stop Campaign
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(campaign)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function CampaignsPage() {
  const {
    campaigns,
    queueStatus,
    creditStatus,
    loading,
    error,
    listCampaigns,
    startCampaign,
    pauseCampaign,
    stopCampaign,
    deleteCampaign,
    refreshQueueStatus,
    refreshCreditStatus,
    clearError,
  } = useCampaignApi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial & Polling
  useEffect(() => {
    listCampaigns();
    refreshQueueStatus();
    refreshCreditStatus();
  }, []);

  useEffect(() => {
    const hasActive = campaigns.some(c => c.status === 'active');
    if (!hasActive) return;
    const interval = setInterval(() => {
      listCampaigns();
      refreshQueueStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [campaigns]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([listCampaigns(), refreshQueueStatus(), refreshCreditStatus()]);
    setIsRefreshing(false);
    toast.success('System Status Updated');
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [campaigns, searchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Operations</h1>
            <p className="text-muted-foreground text-sm font-medium">High-volume outbound management.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    Sync
            </Button>
            <Button 
              onClick={() => setCreateModalOpen(true)}
              className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <Plus size={16} />
                    New Campaign
            </Button>
          </div>
        </div>

        <CampaignsGuide />

        {/* System Status Bar (Control Tower) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PaperCard className="bg-muted/5 border-border/40">
            <PaperCardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Running</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono">{campaigns.filter(c => c.status === 'active').length}</span>
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>
              <div className={cn('w-2 h-2 rounded-full', campaigns.some(c => c.status === 'active') ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
            </PaperCardContent>
          </PaperCard>

          <PaperCard className="bg-muted/5 border-border/40">
            <PaperCardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Pending</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono">{queueStatus?.queue_depth || 0}</span>
                  <span className="text-xs text-muted-foreground">In Queue</span>
                </div>
              </div>
              <Activity size={16} className="text-primary" />
            </PaperCardContent>
          </PaperCard>

          <PaperCard className="bg-muted/5 border-border/40">
            <PaperCardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Balance</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono">{creditStatus?.available_credits.toFixed(0) || 0}</span>
                  <span className="text-xs text-muted-foreground">Credits</span>
                </div>
              </div>
              {creditStatus?.campaign_paused && <Badge variant="destructive" className="text-[8px] h-5">Low Fuel</Badge>}
            </PaperCardContent>
          </PaperCard>
        </div>

        {/* Campaign Ledger */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input 
                placeholder="Filter campaigns..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-64 bg-muted/10 border-border/40 text-xs focus:ring-primary focus:border-primary transition-all rounded-md"
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-mono">
              <FolderOpen size={12} />
              <span>{filteredCampaigns.length} Campaigns</span>
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/20 overflow-hidden min-h-[400px]">
            {/* Table Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20 bg-muted/5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-[25%] pl-1">Campaign</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-[20%]">Status</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-[15%]">Performance</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-[15%]">Config</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-[15%] text-right pr-2">Control</span>
            </div>

            {loading && campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Operations...</span>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground italic uppercase tracking-widest">No operations found.</div>
            ) : (
              <div className="flex flex-col">
                {filteredCampaigns.map(c => (
                  <CampaignRow 
                    key={c.id} 
                    campaign={c} 
                    onStart={startCampaign}
                    onPause={pauseCampaign}
                    onStop={stopCampaign}
                    onDelete={deleteCampaign}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <CreateCampaignModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
        onCampaignCreated={() => listCampaigns()} 
      />
    </div>
  );
}
