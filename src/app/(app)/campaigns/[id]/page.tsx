'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  UploadCloud,
  FileSpreadsheet,
  Settings2,
  Calendar,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import { useCampaign } from '@/app/contexts/campaign-context';
import { CSVUpload } from '../components/csv-upload';
import { loadCSVPreview, CSVPreviewCache } from '@/lib/utils/csv-preview';
import { loadCampaignConfig, saveCampaignContacts, loadCampaignContacts } from '@/lib/utils/campaign-storage';
import {
  Campaign,
  CampaignStatus,
  CSVContact,
  CAMPAIGN_API_CONFIG,
  canStartCampaign,
  canPauseCampaign,
  canStopCampaign,
} from '@/types/campaign.types';
import { cn } from '@/lib/utils';

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
    creditStatus,
    loading,
    error,
    getCampaign,
    uploadCSV,
    startCampaign: startCampaignApi,
    pauseCampaign: pauseCampaignApi,
    stopCampaign: stopCampaignApi,
    refreshQueueStatus,
    refreshCreditStatus,
    clearError,
  } = useCampaignApi();

  const {
    campaignStatus,
    setContacts,
    setResults,
    setOutputFileName,
    setSelectedAssistantId,
    setSelectedTrunk,
    setSessionKey,
    startCampaign: startCallingLoop,
    stopCampaign: stopCallingLoop,
  } = useCampaign();

  const [csvPreview, setCsvPreview] = useState<CSVPreviewCache | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localConfigMissing, setLocalConfigMissing] = useState(false);
  const stopSentRef = useRef(false);

  // Initialization
  useEffect(() => {
    getCampaign(campaignId);
    const preview = loadCSVPreview(campaignId);
    setCsvPreview(preview);
    setSessionKey(`campaign-${campaignId}`);
    stopSentRef.current = false;
    const cfg = loadCampaignConfig(campaignId);
    setLocalConfigMissing(!cfg);
  }, [campaignId, getCampaign, setSessionKey]);

  // Polling
  useEffect(() => {
    if (!campaign || campaign.status !== 'active') return;
    const interval = setInterval(() => {
      getCampaign(campaignId);
      refreshQueueStatus();
    }, CAMPAIGN_API_CONFIG.POLL_INTERVALS.QUEUE_STATUS);
    return () => clearInterval(interval);
  }, [campaign, campaignId, getCampaign, refreshQueueStatus]);

  // Handlers
  const handleCSVUpload = async (file: File, result: any) => {
    setIsUploading(true);
    try {
      const response = await uploadCSV(campaignId, file);
      toast.success(`Ingested ${response.totalRows} contacts`);
      await getCampaign(campaignId);
      saveCampaignContacts(campaignId, result.contacts);
      
      if (campaignStatus !== 'running') {
        const mapped = result.contacts.map((c: any) => ({ phoneNumber: c.phone_number, calleeInfo: { ...c } }));
        setContacts(mapped);
        setResults([]);
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewSaved = (preview: CSVPreviewCache) => {
    setCsvPreview(preview);
    if (campaignStatus !== 'running') {
        const mapped = preview.preview.map((c: any) => ({ phoneNumber: c.phone_number, calleeInfo: { ...c } }));
        setContacts(mapped);
        setResults([]);
    }
  };

  const handleStart = async () => {
    if (!campaign) return;
    try {
      const cfg = loadCampaignConfig(campaign.id);
      if (!cfg?.assistantId || !cfg?.trunkName) {
        setLocalConfigMissing(true);
        toast.error('Configuration lost. Please recreate campaign.');
        return;
      }
      const storedContacts = loadCampaignContacts<CSVContact>(campaign.id);
      if (!storedContacts || storedContacts.length === 0) {
        toast.error('Contact list required.');
        return;
      }

      setSelectedAssistantId(cfg.assistantId);
      setSelectedTrunk(cfg.trunkName);
      setOutputFileName(campaign.name || 'results');
      const mapped = storedContacts.map((c) => ({ phoneNumber: c.phone_number, calleeInfo: { ...c } }));
      setContacts(mapped);
      setResults([]);

      await startCampaignApi(campaign.id);
      await startCallingLoop();
      toast.success('Campaign Initiated');
    } catch (error) {
      console.error(error);
    }
  };

  const handlePause = async () => {
    if (!campaign) return;
    await pauseCampaignApi(campaign.id);
    stopCallingLoop();
    toast.success('Operations Paused');
  };

  const handleStop = async () => {
    if (!campaign) return;
    await stopCampaignApi(campaign.id);
    stopCallingLoop();
    toast.success('Operations Terminated');
  };

  if (loading && !campaign) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!campaign) return null;

  const statusConfig = getStatusConfig(campaign.status);
  const progressPercent = campaign.total_contacts > 0 ? Math.round(((campaign.successful_calls + campaign.failed_calls) / campaign.total_contacts) * 100) : 0;
  const successRate = campaign.successful_calls + campaign.failed_calls > 0 ? Math.round((campaign.successful_calls / (campaign.successful_calls + campaign.failed_calls)) * 100) : 0;

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
                    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border", statusConfig.bg, statusConfig.border)}>
                        <statusConfig.icon size={12} className={statusConfig.color} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", statusConfig.color)}>{statusConfig.label}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => { getCampaign(campaignId); refreshQueueStatus(); }} className="h-10 border-border text-[10px] font-bold uppercase tracking-widest">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
                {canStartCampaign(campaign.status) && (
                    <Button onClick={handleStart} disabled={loading || campaign.total_contacts === 0} className="h-10 gap-2 bg-green-600 hover:bg-green-700 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest">
                        <Play size={14} /> Execute
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
                        <StatItem label="Completion" value={`${progressPercent}%`} subtext={`${campaign.successful_calls + campaign.failed_calls} / ${campaign.total_contacts}`} />
                        <div className="h-10 w-px bg-border/20" />
                        <StatItem label="Success" value={`${successRate}%`} subtext={`${campaign.successful_calls} Connected`} />
                        <div className="h-10 w-px bg-border/20" />
                        <StatItem label="Pending" value={queueStatus?.queue_depth || 0} subtext="In Queue" />
                        <div className="h-10 w-px bg-border/20" />
                        <StatItem label="Rate" value={`${campaign.calls_per_second} CPS`} subtext="Throttle" />
                    </PaperCardContent>
                    <div className="px-8 pb-8">
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                        </div>
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
