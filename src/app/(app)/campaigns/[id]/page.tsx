'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import { loadCSVPreview } from '@/lib/utils/csv-preview';
import {
  CampaignStatus,
  CSVPreviewCache,
  CAMPAIGN_API_CONFIG,
  canStartCampaign,
  canPauseCampaign,
  canStopCampaign,
  getCampaignProgress,
} from '@/types/campaign.types';
import { cn } from '@/lib/utils';

import { CSVUpload } from '../components/csv-upload';

// --- Helpers ---

const getStatusConfig = (status: CampaignStatus) => {
  switch (status) {
  case 'active': return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Activity, label: 'Running' };
  case 'paused': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Pause, label: 'Paused' };
  case 'completed': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2, label: 'Complete' };
  case 'stopped': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle, label: 'Aborted' };
  default: return { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border/40', icon: Clock, label: 'Queued' };
  }
};

// --- Sub-Components ---

const StatItem = ({ label, value, subtext }: { label: string, value: string | number, subtext?: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</span>
    <span className="text-2xl font-mono font-bold tracking-tight text-foreground">{value}</span>
    {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
  </div>
);

const ConfigItem = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex justify-between py-2 border-b border-border/10 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-bold text-foreground">{value}</span>
  </div>
);

// --- Main Page ---

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const {
    currentCampaign: campaign,
    queueStatus,
    campaignStats,
    loading,
    error,
    getCampaign,
    uploadCSV,
    startCampaign: startCampaignApi,
    pauseCampaign: pauseCampaignApi,
    resumeCampaign: resumeCampaignApi,
    stopCampaign: stopCampaignApi,
    refreshQueueStatus,
    refreshCampaignStats,
  } = useCampaignApi();

  const [csvPreview, setCsvPreview] = useState<CSVPreviewCache | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialization
  useEffect(() => {
    void getCampaign(campaignId);
    void refreshCampaignStats(campaignId).catch(() => {});
    const preview = loadCSVPreview(campaignId);
    setCsvPreview(preview);
  }, [campaignId, getCampaign, refreshCampaignStats]);

  // Polling
  useEffect(() => {
    if (!campaign || campaign.status !== 'active') return;
    const interval = setInterval(() => {
      void getCampaign(campaignId);
      void refreshQueueStatus();
      void refreshCampaignStats(campaignId).catch(() => {});
    }, CAMPAIGN_API_CONFIG.POLL_INTERVALS.QUEUE_STATUS);

    return () => clearInterval(interval);
  }, [campaign, campaignId, getCampaign, refreshCampaignStats, refreshQueueStatus]);

  // Handlers
  const handleCSVUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const response = await uploadCSV(campaignId, file);
      toast.success(`Ingested ${response.totalRows} contacts`);
      await getCampaign(campaignId);
      await refreshCampaignStats(campaignId).catch(() => {});
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewSaved = (preview: CSVPreviewCache | null) => {
    setCsvPreview(preview);
  };

  const prepareCampaignRun = async () => {
    if (!campaign) return false;
    if (!campaign.assistant_id || !campaign.trunk_name) {
      toast.error('Campaign configuration missing.');

      return false;
    }
    if (campaign.total_contacts <= 0) {
      toast.error('Contact list required.');

      return false;
    }

    return true;
  };

  const handleStart = async () => {
    if (!campaign) return;
    try {
      const ready = await prepareCampaignRun();
      if (!ready) return;
      await startCampaignApi(campaign.id);
      await refreshCampaignStats(campaign.id).catch(() => {});
      toast.success('Campaign Initiated');
    } catch (error) {
      console.error(error);
    }
  };

  const handleResume = async () => {
    if (!campaign) return;
    try {
      const ready = await prepareCampaignRun();
      if (!ready) return;
      await resumeCampaignApi(campaign.id);
      await refreshCampaignStats(campaign.id).catch(() => {});
      toast.success('Campaign Resumed');
    } catch (error) {
      console.error(error);
    }
  };

  const handlePause = async () => {
    if (!campaign) return;
    await pauseCampaignApi(campaign.id);
    await refreshCampaignStats(campaign.id).catch(() => {});
    toast.success('Operations Paused');
  };

  const handleStop = async () => {
    if (!campaign) return;
    await stopCampaignApi(campaign.id);
    await refreshCampaignStats(campaign.id).catch(() => {});
    toast.success('Operations Terminated');
  };

  if (loading && !campaign) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!campaign) return null;

  const statusConfig = getStatusConfig(campaign.status);
  const currentCampaignStats = campaignStats[campaignId];
  const progress = getCampaignProgress(campaign, currentCampaignStats);
  const completedCalls = Math.max(0, currentCampaignStats?.completed_contacts ?? campaign.successful_calls ?? 0);
  const failedCalls = Math.max(0, currentCampaignStats?.failed_contacts ?? campaign.failed_calls ?? 0);
  const attempts = completedCalls + failedCalls;
  const successRate = attempts > 0 ? Math.round((completedCalls / attempts) * 100) : 0;
  const runtimeStatusLabel = campaign.status === 'active'
    ? (!queueStatus?.time_window_active
      ? 'Waiting for call window'
      : queueStatus.credits_available === false
        ? 'Waiting for credits'
        : progress.statusLabel)
    : progress.statusLabel;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10">
        
        {/* Header Horizon */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-4">
            <button onClick={() => router.push('/campaigns')} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft size={12} /> Operations
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-medium tracking-tighter text-foreground">{campaign.name}</h1>
              <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full border', statusConfig.bg, statusConfig.border)}>
                <statusConfig.icon size={12} className={statusConfig.color} />
                <span className={cn('text-[10px] font-bold uppercase tracking-widest', statusConfig.color)}>{statusConfig.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void getCampaign(campaignId); void refreshQueueStatus(); void refreshCampaignStats(campaignId).catch(() => {}); }}
              className="h-10 border-border text-[10px] font-bold uppercase tracking-widest"
              aria-label="Refresh campaign"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            {canStartCampaign(campaign.status) && (
              <Button onClick={handleStart} disabled={loading || campaign.total_contacts === 0} className="h-10 gap-2 bg-green-600 hover:bg-green-700 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest">
                <Play size={14} /> Execute
              </Button>
            )}
            {campaign.status === 'paused' && (
              <Button onClick={handleResume} disabled={loading} className="h-10 gap-2 bg-green-600 hover:bg-green-700 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest">
                <Play size={14} /> Resume
              </Button>
            )}
            {canPauseCampaign(campaign.status) && (
              <Button onClick={handlePause} disabled={loading} className="h-10 gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest">
                <Pause size={14} /> Halt
              </Button>
            )}
            {canStopCampaign(campaign.status) && (
              <Button onClick={handleStop} disabled={loading} variant="destructive" className="h-10 gap-2 rounded-[4px] text-[10px] font-bold uppercase tracking-widest">
                <Square size={14} /> Abort
              </Button>
            )}
          </div>
        </div>

        {error && <div className="p-4 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest rounded-md flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
            
          {/* Main Operations Deck */}
          <div className="space-y-8">
                
            {/* Telemetry Bar */}
            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardContent className="p-8 flex items-center justify-between">
                <StatItem label="Completion" value={`${progress.percent}%`} subtext={`${progress.processed} / ${progress.total} • ${runtimeStatusLabel}`} />
                <div className="h-10 w-px bg-border/20" />
                <StatItem label="Success" value={`${successRate}%`} subtext={`${completedCalls} Connected`} />
                <div className="h-10 w-px bg-border/20" />
                <StatItem label="Pending" value={(currentCampaignStats?.pending_contacts ?? progress.pending) || 0} subtext="In Queue" />
                <div className="h-10 w-px bg-border/20" />
                <StatItem label="Rate" value={`${campaign.calls_per_second} CPS`} subtext="Throttle" />
              </PaperCardContent>
              <div className="px-8 pb-8">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={cn(
                    'h-full transition-all duration-1000 ease-out',
                    campaign.status === 'active'
                      ? 'bg-green-500'
                      : campaign.status === 'paused'
                        ? 'bg-yellow-500'
                        : campaign.status === 'completed'
                          ? 'bg-blue-500'
                          : campaign.status === 'stopped'
                            ? 'bg-red-500'
                            : 'bg-primary',
                  )} style={{ width: `${progress.percent}%` }} />
                </div>
                {campaign.status === 'active' && queueStatus && (!queueStatus.time_window_active || queueStatus.credits_available === false) && (
                  <p className="mt-2 text-[10px] font-medium text-muted-foreground">
                    {queueStatus.time_window_active ? 'Campaign is paused until credits are available.' : 'Campaign is outside configured daily calling window.'}
                  </p>
                )}
              </div>
            </PaperCard>

            {/* Contact Operations */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">Target List</h2>
                {csvPreview && <span className="text-[10px] font-mono text-muted-foreground">{csvPreview.totalContacts} ROWS READY</span>}
              </div>
                    
              <div className="bg-background border border-border/40 rounded-md overflow-hidden min-h-[300px]">
                <CSVUpload
                  campaignId={campaignId}
                  onUploadComplete={handleCSVUpload}
                  onPreviewSaved={handlePreviewSaved}
                  existingPreview={csvPreview}
                  disabled={loading || isUploading || campaign.status === 'active'}
                />
              </div>
            </section>
          </div>

          {/* Sidecar: Config & Timeline */}
          <div className="space-y-8">
                
            {/* Configuration Readout */}
            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-primary" />
                  <PaperCardTitle className="text-[10px]">Parameters</PaperCardTitle>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-4 space-y-1">
                <ConfigItem label="Line" value={campaign.provider} />
                <ConfigItem label="Trunk" value={campaign.trunk_name} />
                <ConfigItem label="Zone" value={campaign.timezone} />
                <ConfigItem label="Window" value={`${campaign.daily_start_time} - ${campaign.daily_end_time}`} />
                <ConfigItem label="Attempts" value={`${campaign.max_retries} Max`} />
              </PaperCardContent>
            </PaperCard>

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Clock size={14} className="text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Log</span>
              </div>
              <div className="space-y-4 pl-2 border-l border-border/20 ml-2">
                <div className="pl-4 relative">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                  <p className="text-xs font-medium">Initialized</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(campaign.created_at), 'PP p')}</p>
                </div>
                {campaign.started_at && (
                  <div className="pl-4 relative">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                    <p className="text-xs font-medium">Execution Started</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(campaign.started_at), 'PP p')}</p>
                  </div>
                )}
                <div className="pl-4 relative">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-muted border-2 border-background" />
                  <p className="text-xs font-medium text-muted-foreground">Synced</p>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(campaign.updated_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
