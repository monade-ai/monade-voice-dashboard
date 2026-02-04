'use client';

import { useState, useCallback } from 'react';

import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { campaignApi } from '@/lib/services/campaign-api.service';
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  QueueStatus,
  CreditStatus,
  CampaignAnalytics,
} from '@/types/campaign.types';
import { ApiError } from '@/lib/http';

interface UseCampaignApiState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  queueStatus: QueueStatus | null;
  creditStatus: CreditStatus | null;
  loading: boolean;
  error: string | null;
}

interface UseCampaignApiReturn extends UseCampaignApiState {
  // CRUD
  createCampaign: (data: Omit<CreateCampaignRequest, 'user_uid'>) => Promise<Campaign>;
  listCampaigns: () => Promise<Campaign[]>;
  getCampaign: (campaignId: string) => Promise<Campaign>;
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
  refreshQueueStatus: () => Promise<QueueStatus>;
  refreshCreditStatus: () => Promise<CreditStatus>;

  // Analytics
  getCampaignAnalytics: (campaignId: string) => Promise<CampaignAnalytics>;

  // Utilities
  clearError: () => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
}

export function useCampaignApi(): UseCampaignApiReturn {
  const { userUid, loading: userLoading } = useMonadeUser();

  const [state, setState] = useState<UseCampaignApiState>({
    campaigns: [],
    currentCampaign: null,
    queueStatus: null,
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

  // ============================================
  // CRUD Operations
  // ============================================

  const createCampaign = useCallback(
    async (data: Omit<CreateCampaignRequest, 'user_uid'>): Promise<Campaign> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        const campaign = await campaignApi.create({ ...data, user_uid: userUid });
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
    [userUid],
  );

  const listCampaigns = useCallback(async (): Promise<Campaign[]> => {
    if (!userUid) {
      if (userLoading) {
        setLoading(false);

        return [];
      }
      throw new Error('User not authenticated');
    }
    setLoading(true);
    try {
      const campaigns = await campaignApi.list(userUid);
      setState((prev) => ({ ...prev, campaigns, loading: false }));

      return campaigns;
    } catch (error) {
      const message = handleError(error);
      setError(message);
      throw error;
    }
  }, [userUid]);

  const getCampaign = useCallback(
    async (campaignId: string): Promise<Campaign> => {
      if (!userUid) {
        if (userLoading) {
          setLoading(false);
          throw new Error('User not ready');
        }
        throw new Error('User not authenticated');
      }
      setLoading(true);
      try {
        const campaign = await campaignApi.get(campaignId, userUid);
        setState((prev) => ({ ...prev, currentCampaign: campaign, loading: false }));

        return campaign;
      } catch (error) {
        const message = handleError(error);
        setError(message);
        throw error;
      }
    },
    [userUid],
  );

  const updateCampaign = useCallback(
    async (campaignId: string, data: UpdateCampaignRequest): Promise<Campaign> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        const updated = await campaignApi.update(campaignId, userUid, data);
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
    [userUid],
  );

  const deleteCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.delete(campaignId, userUid);
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
    [userUid],
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
    [userUid],
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
    [userUid],
  );

  const pauseCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.pause(campaignId, userUid);
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
    [userUid],
  );

  const resumeCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        // NOTE: Resume endpoint returns 404 - flagged with backend
        await campaignApi.resume(campaignId, userUid);
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
    [userUid],
  );

  const stopCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      if (!userUid) throw new Error('User not authenticated');
      setLoading(true);
      try {
        await campaignApi.stop(campaignId, userUid);
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
    [userUid],
  );

  // ============================================
  // Monitoring Operations
  // ============================================

  const refreshQueueStatus = useCallback(async (): Promise<QueueStatus> => {
    if (!userUid) {
      if (userLoading) throw new Error('User not ready');
      throw new Error('User not authenticated');
    }
    try {
      const queueStatus = await campaignApi.getQueueStatus(userUid);
      setState((prev) => ({ ...prev, queueStatus }));

      return queueStatus;
    } catch (error) {
      const message = handleError(error);
      setError(message);
      throw error;
    }
  }, [userUid]);

  const refreshCreditStatus = useCallback(async (): Promise<CreditStatus> => {
    if (!userUid) {
      if (userLoading) throw new Error('User not ready');
      throw new Error('User not authenticated');
    }
    try {
      const creditStatus = await campaignApi.getCreditStatus(userUid);
      setState((prev) => ({ ...prev, creditStatus }));

      return creditStatus;
    } catch (error) {
      const message = handleError(error);
      setError(message);
      throw error;
    }
  }, [userUid]);

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
    refreshCreditStatus,
    getCampaignAnalytics,
    clearError,
    setCurrentCampaign,
  };
}
