'use client';

import { useState, useCallback } from 'react';

import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { campaignApi } from '@/lib/services/campaign-api.service';
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  QueueStatus,
  CampaignMonitoringStats,
  CampaignContact,
  CreditStatus,
  CampaignAnalytics,
} from '@/types/campaign.types';
import { ApiError } from '@/lib/http';
import {
  clearLocalCacheByResource,
  createScopedCacheKey,
  getCurrentOrganizationId,
  readLocalCache,
  writeLocalCache,
} from '@/lib/utils/client-cache';

interface UseCampaignApiState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  queueStatus: QueueStatus | null;
  campaignStats: Record<string, CampaignMonitoringStats>;
  campaignContacts: Record<string, CampaignContact[]>;
  creditStatus: CreditStatus | null;
  loading: boolean;
  error: string | null;
}

interface UseCampaignApiReturn extends UseCampaignApiState {
  // CRUD
  createCampaign: (data: Omit<CreateCampaignRequest, 'user_uid'>) => Promise<Campaign>;
  listCampaigns: (forceRefresh?: boolean) => Promise<Campaign[]>;
  getCampaign: (campaignId: string, forceRefresh?: boolean) => Promise<Campaign>;
  updateCampaign: (campaignId: string, data: UpdateCampaignRequest) => Promise<Campaign>;
  deleteCampaign: (campaignId: string) => Promise<void>;

  // CSV Upload
  uploadCSV: (campaignId: string, file: File) => Promise<{ totalRows: number }>;

  // Control
  startCampaign: (campaignId: string) => Promise<void>;
  pauseCampaign: (campaignId: string) => Promise<void>;
  resumeCampaign: (campaignId: string) => Promise<void>;
  stopCampaign: (campaignId: string) => Promise<void>;

  // Monitoring
  refreshQueueStatus: (forceRefresh?: boolean) => Promise<QueueStatus>;
  refreshCampaignStats: (campaignId: string, forceRefresh?: boolean) => Promise<CampaignMonitoringStats>;
  refreshCampaignContacts: (campaignId: string, options?: CampaignContactsOptions) => Promise<CampaignContact[]>;
  refreshCreditStatus: (forceRefresh?: boolean) => Promise<CreditStatus>;

  // Analytics
  getCampaignAnalytics: (campaignId: string) => Promise<CampaignAnalytics>;

  // Utilities
  clearError: () => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
}

type CampaignContactsOptions = {
  skip?: number;
  limit?: number;
  forceRefresh?: boolean;
};

const CAMPAIGN_LIST_CACHE_RESOURCE = 'campaign-list';
const CAMPAIGN_DETAIL_CACHE_RESOURCE = 'campaign-detail';
const CAMPAIGN_QUEUE_CACHE_RESOURCE = 'campaign-queue';
const CAMPAIGN_STATS_CACHE_RESOURCE = 'campaign-stats';
const CAMPAIGN_CONTACTS_CACHE_RESOURCE = 'campaign-contacts';
const CAMPAIGN_CREDIT_CACHE_RESOURCE = 'campaign-credit';
const CAMPAIGN_LIST_CACHE_TTL_MS = 30_000;
const CAMPAIGN_DETAIL_CACHE_TTL_MS = 20_000;
const CAMPAIGN_QUEUE_CACHE_TTL_MS = 15_000;
const CAMPAIGN_STATS_CACHE_TTL_MS = 20_000;
const CAMPAIGN_CONTACTS_CACHE_TTL_MS = 60_000;
const CAMPAIGN_CREDIT_CACHE_TTL_MS = 30_000;

export function useCampaignApi(): UseCampaignApiReturn {
  const { userUid, loading: userLoading } = useMonadeUser();

  const [state, setState] = useState<UseCampaignApiState>({
    campaigns: [],
    currentCampaign: null,
    queueStatus: null,
    campaignStats: {},
    campaignContacts: {},
    creditStatus: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) =>
    setState((prev) => ({ ...prev, loading, error: loading ? null : prev.error }));

  const setError = (error: string | null) =>
    setState((prev) => ({ ...prev, error, loading: false }));

  const handleError = (error: unknown): string => {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred';
  };

  const scopedCacheKey = useCallback((resource: string, params?: unknown) => {
    if (!userUid) return null;

    return createScopedCacheKey(
      { userUid, organizationId: getCurrentOrganizationId() },
      resource,
      params,
    );
  }, [userUid]);

  const clearCampaignCaches = useCallback(() => {
    clearLocalCacheByResource(CAMPAIGN_LIST_CACHE_RESOURCE);
    clearLocalCacheByResource(CAMPAIGN_DETAIL_CACHE_RESOURCE);
    clearLocalCacheByResource(CAMPAIGN_QUEUE_CACHE_RESOURCE);
    clearLocalCacheByResource(CAMPAIGN_STATS_CACHE_RESOURCE);
    clearLocalCacheByResource(CAMPAIGN_CONTACTS_CACHE_RESOURCE);
    clearLocalCacheByResource(CAMPAIGN_CREDIT_CACHE_RESOURCE);
  }, []);

  // ============================================
  // CRUD Operations
  // ============================================

  const createCampaign = useCallback(
    async (data: Omit<CreateCampaignRequest, 'user_uid'>): Promise<Campaign> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        const campaign = await campaignApi.create({ ...data, user_uid: userUid });
        clearCampaignCaches();
        setState((prev) => ({
          ...prev,
          campaigns: [...prev.campaigns, campaign],
          currentCampaign: campaign,
          loading: false,
        }));

        return campaign;
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  const listCampaigns = useCallback(async (forceRefresh = false): Promise<Campaign[]> => {
    if (!userUid) {
      if (userLoading) {
        setLoading(false);

        return [];
      }
      throw new Error('User not authenticated');
    }
    const cacheKey = scopedCacheKey(CAMPAIGN_LIST_CACHE_RESOURCE, { userUid });
    if (!forceRefresh && cacheKey) {
      const cached = readLocalCache<Campaign[]>(cacheKey);
      if (cached) {
        setState((prev) => ({ ...prev, campaigns: cached.value, loading: false }));

        return cached.value;
      }
    }
    setLoading(true);
    try {
      const campaigns = await campaignApi.list(userUid);
      setState((prev) => ({ ...prev, campaigns, loading: false }));
      if (cacheKey) writeLocalCache(cacheKey, campaigns, CAMPAIGN_LIST_CACHE_TTL_MS);

      return campaigns;
    } catch (error) {
      const message = handleError(error);
      setError(message);
      throw error;
    }
  }, [scopedCacheKey, userUid, userLoading]);

  const getCampaign = useCallback(
    async (campaignId: string, forceRefresh = false): Promise<Campaign> => {
      if (!userUid) {
        if (userLoading) {
          setLoading(false);
          throw new Error('User not ready');
        }
        throw new Error('User not authenticated');
      }
      setLoading(true);
      try {
        const cacheKey = scopedCacheKey(CAMPAIGN_DETAIL_CACHE_RESOURCE, { campaignId, userUid });
        const cached = !forceRefresh && cacheKey ? readLocalCache<Campaign>(cacheKey) : null;
        if (cached) {
          setState((prev) => ({ ...prev, currentCampaign: cached.value, loading: false }));

          return cached.value;
        }

        const campaign = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({ ...prev, currentCampaign: campaign, loading: false }));
        if (cacheKey) writeLocalCache(cacheKey, campaign, CAMPAIGN_DETAIL_CACHE_TTL_MS);

        return campaign;
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [scopedCacheKey, userUid, userLoading],
  );

  const updateCampaign = useCallback(
    async (campaignId: string, data: UpdateCampaignRequest): Promise<Campaign> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        const updated = await campaignApi.update(campaignId, userUid, data);
        clearCampaignCaches();
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updated : c)),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? updated : prev.currentCampaign,
          loading: false,
        }));

        return updated;
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  const deleteCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.delete(campaignId, userUid);
        clearCampaignCaches();
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? null : prev.currentCampaign,
          loading: false,
        }));
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  // ============================================
  // CSV Upload
  // ============================================

  const uploadCSV = useCallback(
    async (campaignId: string, file: File): Promise<{ totalRows: number }> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        const response = await campaignApi.uploadCSV(campaignId, userUid, file);
        clearCampaignCaches();
        // Refresh campaign to get updated contact count
        const updated = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updated : c)),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? updated : prev.currentCampaign,
          loading: false,
        }));

        return { totalRows: response.total_rows };
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  // ============================================
  // Control Operations
  // ============================================

  const startCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.start(campaignId, userUid);
        clearCampaignCaches();
        const updated = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updated : c)),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? updated : prev.currentCampaign,
          loading: false,
        }));
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  const pauseCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.pause(campaignId, userUid);
        clearCampaignCaches();
        const updated = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updated : c)),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? updated : prev.currentCampaign,
          loading: false,
        }));
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  const resumeCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.resume(campaignId, userUid);
        clearCampaignCaches();
        const updated = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updated : c)),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? updated : prev.currentCampaign,
          loading: false,
        }));
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  const stopCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.stop(campaignId, userUid);
        clearCampaignCaches();
        const updated = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({
          ...prev,
          campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updated : c)),
          currentCampaign:
            prev.currentCampaign?.id === campaignId ? updated : prev.currentCampaign,
          loading: false,
        }));
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [clearCampaignCaches, userUid],
  );

  // ============================================
  // Monitoring Operations
  // ============================================

  const refreshQueueStatus = useCallback(async (forceRefresh = false): Promise<QueueStatus> => {
    if (!userUid) {
      if (userLoading) throw new Error('User not ready');
      throw new Error('User not authenticated');
    }
    try {
      const cacheKey = scopedCacheKey(CAMPAIGN_QUEUE_CACHE_RESOURCE, { userUid });
      const cached = !forceRefresh && cacheKey ? readLocalCache<QueueStatus>(cacheKey) : null;
      if (cached) {
        setState((prev) => ({ ...prev, queueStatus: cached.value }));

        return cached.value;
      }

      const queueStatus = await campaignApi.getQueueStatus(userUid);
      setState((prev) => ({ ...prev, queueStatus }));
      if (cacheKey) writeLocalCache(cacheKey, queueStatus, CAMPAIGN_QUEUE_CACHE_TTL_MS);

      return queueStatus;
    } catch (error) {
      const message = handleError(error);
      setError(message);
      throw error;
    }
  }, [scopedCacheKey, userUid, userLoading]);

  const refreshCampaignStats = useCallback(
    async (campaignId: string, forceRefresh = false): Promise<CampaignMonitoringStats> => {
      if (!userUid) {
        if (userLoading) throw new Error('User not ready');
        throw new Error('User not authenticated');
      }
      try {
        const cacheKey = scopedCacheKey(CAMPAIGN_STATS_CACHE_RESOURCE, { campaignId, userUid });
        const cached = !forceRefresh && cacheKey ? readLocalCache<CampaignMonitoringStats>(cacheKey) : null;
        if (cached) {
          setState((prev) => ({
            ...prev,
            campaignStats: {
              ...prev.campaignStats,
              [campaignId]: cached.value,
            },
          }));

          return cached.value;
        }

        const stats = await campaignApi.getCampaignMonitoringStats(campaignId, userUid);
        setState((prev) => ({
          ...prev,
          campaignStats: {
            ...prev.campaignStats,
            [campaignId]: stats,
          },
        }));
        if (cacheKey) writeLocalCache(cacheKey, stats, CAMPAIGN_STATS_CACHE_TTL_MS);

        return stats;
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [scopedCacheKey, userUid, userLoading],
  );

  const refreshCampaignContacts = useCallback(
    async (
      campaignId: string,
      options?: CampaignContactsOptions,
    ): Promise<CampaignContact[]> => {
      if (!userUid) {
        if (userLoading) throw new Error('User not ready');
        throw new Error('User not authenticated');
      }
      try {
        const cacheParams = {
          campaignId,
          userUid,
          skip: options?.skip ?? 0,
          limit: options?.limit ?? 200,
        };
        const cacheKey = scopedCacheKey(CAMPAIGN_CONTACTS_CACHE_RESOURCE, cacheParams);
        const cached = !options?.forceRefresh && cacheKey ? readLocalCache<CampaignContact[]>(cacheKey) : null;
        if (cached) {
          setState((prev) => ({
            ...prev,
            campaignContacts: {
              ...prev.campaignContacts,
              [campaignId]: cached.value,
            },
          }));

          return cached.value;
        }

        const contacts = await campaignApi.getCampaignContacts(
          campaignId,
          userUid,
          options?.skip ?? 0,
          options?.limit ?? 200,
        );
        setState((prev) => ({
          ...prev,
          campaignContacts: {
            ...prev.campaignContacts,
            [campaignId]: contacts,
          },
        }));
        if (cacheKey) writeLocalCache(cacheKey, contacts, CAMPAIGN_CONTACTS_CACHE_TTL_MS);

        return contacts;
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [scopedCacheKey, userUid, userLoading],
  );

  const refreshCreditStatus = useCallback(async (forceRefresh = false): Promise<CreditStatus> => {
    if (!userUid) {
      if (userLoading) throw new Error('User not ready');
      throw new Error('User not authenticated');
    }
    try {
      const cacheKey = scopedCacheKey(CAMPAIGN_CREDIT_CACHE_RESOURCE, { userUid });
      const cached = !forceRefresh && cacheKey ? readLocalCache<CreditStatus>(cacheKey) : null;
      if (cached) {
        setState((prev) => ({ ...prev, creditStatus: cached.value }));

        return cached.value;
      }

      const creditStatus = await campaignApi.getCreditStatus(userUid);
      setState((prev) => ({ ...prev, creditStatus }));
      if (cacheKey) writeLocalCache(cacheKey, creditStatus, CAMPAIGN_CREDIT_CACHE_TTL_MS);

      return creditStatus;
    } catch (error) {
      const message = handleError(error);
      setError(message);
      throw error;
    }
  }, [scopedCacheKey, userUid, userLoading]);

  // ============================================
  // Analytics
  // ============================================

  const getCampaignAnalytics = useCallback(
    async (campaignId: string): Promise<CampaignAnalytics> => {
      if (!userUid) throw new Error('User not authenticated');
      try {
        return await campaignApi.getAnalytics(campaignId, userUid);
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [userUid],
  );

  // ============================================
  // Utilities
  // ============================================

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setCurrentCampaign = useCallback((campaign: Campaign | null) => {
    setState((prev) => ({ ...prev, currentCampaign: campaign }));
  }, []);

  return {
    ...state,
    createCampaign,
    listCampaigns,
    getCampaign,
    updateCampaign,
    deleteCampaign,
    uploadCSV,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    refreshQueueStatus,
    refreshCampaignStats,
    refreshCampaignContacts,
    refreshCreditStatus,
    getCampaignAnalytics,
    clearError,
    setCurrentCampaign,
  };
}
