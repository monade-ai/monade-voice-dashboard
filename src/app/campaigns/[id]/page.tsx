'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  Users,
  Calendar,
  Settings,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import { CSVUpload } from '../components/csv-upload';
import { loadCSVPreview, deleteCSVPreview, ParseCSVResult } from '@/lib/utils/csv-preview';
import {
  Campaign,
  CampaignStatus,
  CSVPreviewCache,
  CAMPAIGN_API_CONFIG,
  canStartCampaign,
  canPauseCampaign,
  canStopCampaign,
  isCampaignFinished,
} from '@/types/campaign.types';

const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    icon: <Clock className="h-4 w-4" />,
  },
  active: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
    icon: <Activity className="h-4 w-4 animate-pulse" />,
  },
  paused: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: <Pause className="h-4 w-4" />,
  },
  stopped: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-700 dark:text-red-300',
    icon: <XCircle className="h-4 w-4" />,
  },
  completed: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

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
    startCampaign,
    pauseCampaign,
    stopCampaign,
    refreshQueueStatus,
    refreshCreditStatus,
    clearError,
  } = useCampaignApi();

  const [csvPreview, setCsvPreview] = useState<CSVPreviewCache | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Load campaign and preview
  useEffect(() => {
    getCampaign(campaignId).catch(console.error);
    const preview = loadCSVPreview(campaignId);
    setCsvPreview(preview);
  }, [campaignId, getCampaign]);

  // Poll for active campaigns
  useEffect(() => {
    if (!campaign || campaign.status !== 'active') return;

    const interval = setInterval(() => {
      getCampaign(campaignId).catch(console.error);
      refreshQueueStatus().catch(console.error);
    }, CAMPAIGN_API_CONFIG.POLL_INTERVALS.QUEUE_STATUS);

    return () => clearInterval(interval);
  }, [campaign, campaignId, getCampaign, refreshQueueStatus]);

  // Clean up preview on completion
  useEffect(() => {
    if (campaign && isCampaignFinished(campaign.status) && csvPreview) {
      // Keep preview for export purposes, but could clean up after export
    }
  }, [campaign, csvPreview]);

  const handleCSVUpload = async (file: File, result: ParseCSVResult) => {
    setIsUploading(true);
    setUploadedFile(file);
    try {
      const response = await uploadCSV(campaignId, file);
      toast.success(`Uploaded ${response.totalRows} contacts`);
      // Refresh campaign to get updated contact count
      await getCampaign(campaignId);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload contacts');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewSaved = (preview: CSVPreviewCache) => {
    setCsvPreview(preview);
  };

  const handleStart = async () => {
    if (!campaign) return;
    try {
      await startCampaign(campaign.id);
      toast.success('Campaign started');
    } catch (error) {
      console.error('Failed to start:', error);
    }
  };

  const handlePause = async () => {
    if (!campaign) return;
    try {
      await pauseCampaign(campaign.id);
      toast.success('Campaign paused');
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleStop = async () => {
    if (!campaign) return;
    try {
      await stopCampaign(campaign.id);
      toast.success('Campaign stopped');
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        getCampaign(campaignId),
        refreshQueueStatus(),
        refreshCreditStatus(),
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  if (loading && !campaign) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Campaign not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The campaign you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push('/campaigns')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[campaign.status];
  const progressPercent = campaign.total_contacts > 0
    ? Math.round(((campaign.successful_calls + campaign.failed_calls) / campaign.total_contacts) * 100)
    : 0;
  const successRate = campaign.successful_calls + campaign.failed_calls > 0
    ? Math.round((campaign.successful_calls / (campaign.successful_calls + campaign.failed_calls)) * 100)
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/campaigns')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.icon}
              <span className="ml-1">{campaign.status}</span>
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground ml-10">
              {campaign.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {canStartCampaign(campaign.status) && (
            <Button
              onClick={handleStart}
              disabled={loading || campaign.total_contacts === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Start Campaign
            </Button>
          )}
          {canPauseCampaign(campaign.status) && (
            <Button variant="outline" onClick={handlePause} disabled={loading}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {canStopCampaign(campaign.status) && (
            <Button variant="destructive" onClick={handleStop} disabled={loading}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold">{campaign.total_contacts}</div>
                  <div className="text-xs text-muted-foreground">Total Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {campaign.successful_calls}
                  </div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {campaign.failed_calls}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {campaign.total_contacts > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className={`font-medium ${successRate >= 70 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {successRate}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacts</CardTitle>
              <CardDescription>
                Upload your contact list to start calling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUpload
                campaignId={campaignId}
                onUploadComplete={handleCSVUpload}
                onPreviewSaved={handlePreviewSaved}
                existingPreview={csvPreview}
                disabled={loading || isUploading || campaign.status === 'active'}
              />
            </CardContent>
          </Card>

          {/* Queue Status (when active) */}
          {campaign.status === 'active' && queueStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Live Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{queueStatus.in_progress_calls}</div>
                    <div className="text-xs text-muted-foreground">Calls In Progress</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{queueStatus.pending_contacts}</div>
                    <div className="text-xs text-muted-foreground">Pending Contacts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{queueStatus.queue_depth}</div>
                    <div className="text-xs text-muted-foreground">Queue Depth</div>
                  </div>
                  <div>
                    <Badge variant={queueStatus.time_window_active ? 'default' : 'secondary'}>
                      {queueStatus.time_window_active ? 'In Schedule' : 'Outside Hours'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Provider</span>
                  <Badge variant="outline">{campaign.provider}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trunk</span>
                  <span className="text-sm font-medium">{campaign.trunk_name}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Schedule</span>
                  <span className="text-sm font-medium">
                    {campaign.daily_start_time} - {campaign.daily_end_time}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Timezone</span>
                  <span className="text-sm font-medium">{campaign.timezone}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Concurrent</span>
                  <span className="text-sm font-medium">{campaign.max_concurrent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Calls/Second</span>
                  <span className="text-sm font-medium">{campaign.calls_per_second}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Retries</span>
                  <span className="text-sm font-medium">{campaign.max_retries}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits */}
          {creditStatus && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {creditStatus.available_credits.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {creditStatus.total_credits.toFixed(1)} total
                </div>
                {creditStatus.campaign_paused && (
                  <Badge variant="destructive" className="mt-2">
                    Campaigns Paused - Low Credits
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="text-sm">
                  {format(new Date(campaign.created_at), 'PPp')}
                </div>
              </div>
              {campaign.started_at && (
                <div>
                  <div className="text-xs text-muted-foreground">Started</div>
                  <div className="text-sm">
                    {format(new Date(campaign.started_at), 'PPp')}
                  </div>
                </div>
              )}
              {campaign.completed_at && (
                <div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-sm">
                    {format(new Date(campaign.completed_at), 'PPp')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
                <div className="text-sm">
                  {formatDistanceToNow(new Date(campaign.updated_at), { addSuffix: true })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
