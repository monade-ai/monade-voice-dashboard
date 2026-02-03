'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Activity,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import { CampaignCard } from './components/campaign-card';
import { CreateCampaignModal } from './components/create-campaign-modal';
import {
  Campaign,
  CampaignStatus,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';

type StatusFilter = CampaignStatus | 'all';
type SortOption = 'created_at' | 'updated_at' | 'name' | 'status';

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    listCampaigns().catch(console.error);
    refreshQueueStatus().catch(console.error);
    refreshCreditStatus().catch(console.error);
  }, [listCampaigns, refreshQueueStatus, refreshCreditStatus]);

  // Polling for active campaigns
  useEffect(() => {
    const hasActiveCampaign = campaigns.some((c) => c.status === 'active');
    if (!hasActiveCampaign) return;

    const interval = setInterval(() => {
      listCampaigns().catch(console.error);
      refreshQueueStatus().catch(console.error);
    }, CAMPAIGN_API_CONFIG.POLL_INTERVALS.CAMPAIGN_LIST);

    return () => clearInterval(interval);
  }, [campaigns, listCampaigns, refreshQueueStatus]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        listCampaigns(),
        refreshQueueStatus(),
        refreshCreditStatus(),
      ]);
      toast.success('Refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [listCampaigns, refreshQueueStatus, refreshCreditStatus]);

  const handleStart = async (campaign: Campaign) => {
    try {
      await startCampaign(campaign.id);
      toast.success(`Campaign "${campaign.name}" started`);
    } catch (error) {
      console.error('Failed to start campaign:', error);
    }
  };

  const handlePause = async (campaign: Campaign) => {
    try {
      await pauseCampaign(campaign.id);
      toast.success(`Campaign "${campaign.name}" paused`);
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  };

  const handleStop = async (campaign: Campaign) => {
    try {
      await stopCampaign(campaign.id);
      toast.success(`Campaign "${campaign.name}" stopped`);
    } catch (error) {
      console.error('Failed to stop campaign:', error);
    }
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    try {
      await deleteCampaign(campaignToDelete.id);
      toast.success(`Campaign "${campaignToDelete.name}" deleted`);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      // Note: Delete endpoint returns 405, so this will fail
      toast.error('Delete is not yet supported by the backend');
    } finally {
      setCampaignToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleCampaignCreated = (campaign: Campaign) => {
    // Navigate to campaign detail page to upload CSV
    window.location.href = `/campaigns/${campaign.id}`;
  };

  // Filter and sort campaigns
  const filteredCampaigns = campaigns
    .filter((campaign) => {
      // Status filter
      if (statusFilter !== 'all' && campaign.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          campaign.name.toLowerCase().includes(query) ||
          campaign.description.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'updated_at':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const activeCampaignCount = campaigns.filter((c) => c.status === 'active').length;
  const totalContacts = campaigns.reduce((sum, c) => sum + c.total_contacts, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Manage your outbound calling campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCampaignCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Credits Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {creditStatus ? creditStatus.available_credits.toFixed(1) : '—'}
            </div>
            {creditStatus?.campaign_paused && (
              <Badge variant="destructive" className="mt-1">
                Paused - Low Credits
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Queue Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueStatus ? queueStatus.queue_depth : '—'}
            </div>
            {queueStatus && !queueStatus.time_window_active && (
              <Badge variant="secondary" className="mt-1">
                Outside Hours
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest First</SelectItem>
              <SelectItem value="updated_at">Recently Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Campaign List */}
      {loading && campaigns.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No campaigns found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first campaign to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
              onDelete={handleDeleteClick}
              disabled={loading}
            />
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCampaignCreated={handleCampaignCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
