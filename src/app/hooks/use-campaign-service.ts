'use client';

import { useCallback } from 'react';
import { useMonadeUser } from './use-monade-user';
import { CONFIG } from '@/config';

// Types
export interface Campaign {
    id: string;
    user_uid: string;
    name: string;
    description?: string;
    provider: string;
    trunk_name: string;
    assistant_id?: string;
    status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
    max_concurrent: number;
    calls_per_second: number;
    daily_start_time?: string;
    daily_end_time?: string;
    timezone?: string;
    max_retries: number;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
    total_contacts: number;
    completed_contacts: number;
    failed_contacts: number;
}

export interface CampaignContact {
    id: string;
    campaign_id: string;
    phone_number: string;
    name?: string;
    metadata?: Record<string, any>;
    status: 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
    attempts: number;
    last_attempt_at?: string;
    call_id?: string;
    created_at: string;
}

export interface CreateCampaignParams {
    name: string;
    description?: string;
    provider: string;
    trunk_name: string;
    assistant_id?: string;
    max_concurrent?: number;
    calls_per_second?: number;
    daily_start_time?: string;
    daily_end_time?: string;
    timezone?: string;
    max_retries?: number;
}

export interface AddContactsParams {
    contacts: Array<{
        phone_number: string;
        name?: string;
        metadata?: Record<string, any>;
    }>;
}

export interface QueueStatus {
    user_uid: string;
    active_campaigns: number;
    pending_contacts: number;
    in_progress_calls: number;
    queue_depth: number;
    time_window_active: boolean;
    credits_available: boolean;
}

export interface CampaignStats {
    campaign_id: string;
    total_contacts: number;
    pending: number;
    queued: number;
    in_progress: number;
    completed: number;
    failed: number;
    no_answer: number;
    success_rate: number;
    avg_call_duration?: number;
}

const API_BASE = CONFIG.CAMPAIGNS.BASE_URL;
const API_VERSION = CONFIG.CAMPAIGNS.API_VERSION;

export function useCampaignService() {
    const { userUid } = useMonadeUser();

    const getApiUrl = useCallback((path: string) => {
        return `${API_BASE}/api/${API_VERSION}${path}`;
    }, []);

    // Campaign CRUD
    const createCampaign = useCallback(async (params: CreateCampaignParams): Promise<Campaign> => {
        const url = getApiUrl('/campaigns/');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_uid: userUid,
                ...params,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create campaign: ${error}`);
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const listCampaigns = useCallback(async (status?: string): Promise<Campaign[]> => {
        let url = getApiUrl(`/campaigns/?user_uid=${userUid}`);
        if (status) url += `&status=${status}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to list campaigns');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const getCampaign = useCallback(async (campaignId: string): Promise<Campaign> => {
        const url = getApiUrl(`/campaigns/${campaignId}?user_uid=${userUid}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to get campaign');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const updateCampaign = useCallback(async (campaignId: string, params: Partial<CreateCampaignParams>): Promise<Campaign> => {
        const url = getApiUrl(`/campaigns/${campaignId}?user_uid=${userUid}`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error('Failed to update campaign');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const deleteCampaign = useCallback(async (campaignId: string): Promise<void> => {
        const url = getApiUrl(`/campaigns/${campaignId}?user_uid=${userUid}`);
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to delete campaign');
        }
    }, [userUid, getApiUrl]);

    // Campaign Control
    const startCampaign = useCallback(async (campaignId: string): Promise<Campaign> => {
        const url = getApiUrl(`/campaigns/${campaignId}/start?user_uid=${userUid}`);
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to start campaign: ${error}`);
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const pauseCampaign = useCallback(async (campaignId: string): Promise<Campaign> => {
        const url = getApiUrl(`/campaigns/${campaignId}/pause?user_uid=${userUid}`);
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to pause campaign');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const resumeCampaign = useCallback(async (campaignId: string): Promise<Campaign> => {
        const url = getApiUrl(`/campaigns/${campaignId}/resume?user_uid=${userUid}`);
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to resume campaign');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const stopCampaign = useCallback(async (campaignId: string): Promise<Campaign> => {
        const url = getApiUrl(`/campaigns/${campaignId}/stop?user_uid=${userUid}`);
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to stop campaign');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    // Contact Management
    const addContacts = useCallback(async (campaignId: string, params: AddContactsParams): Promise<{ added: number; duplicates: number }> => {
        const url = getApiUrl(`/campaigns/${campaignId}/contacts?user_uid=${userUid}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error('Failed to add contacts');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const uploadCSV = useCallback(async (campaignId: string, file: File): Promise<{ added: number; duplicates: number }> => {
        const url = getApiUrl(`/campaigns/${campaignId}/upload-csv?user_uid=${userUid}`);
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error('Failed to upload CSV');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const getContacts = useCallback(async (campaignId: string, skip = 0, limit = 100): Promise<CampaignContact[]> => {
        const url = getApiUrl(`/campaigns/${campaignId}/contacts?user_uid=${userUid}&skip=${skip}&limit=${limit}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to get contacts');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const clearContacts = useCallback(async (campaignId: string): Promise<void> => {
        const url = getApiUrl(`/campaigns/${campaignId}/contacts?user_uid=${userUid}`);
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to clear contacts');
        }
    }, [userUid, getApiUrl]);

    // Monitoring
    const getQueueStatus = useCallback(async (): Promise<QueueStatus> => {
        const url = getApiUrl(`/monitoring/queue-status/${userUid}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to get queue status');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const getCampaignStats = useCallback(async (campaignId: string): Promise<CampaignStats> => {
        const url = getApiUrl(`/monitoring/campaigns/${campaignId}/stats?user_uid=${userUid}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to get campaign stats');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    const getCampaignAnalytics = useCallback(async (campaignId: string): Promise<any> => {
        const url = getApiUrl(`/campaigns/${campaignId}/analytics?user_uid=${userUid}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to get campaign analytics');
        }
        return response.json();
    }, [userUid, getApiUrl]);

    return {
        // CRUD
        createCampaign,
        listCampaigns,
        getCampaign,
        updateCampaign,
        deleteCampaign,
        // Control
        startCampaign,
        pauseCampaign,
        resumeCampaign,
        stopCampaign,
        // Contacts
        addContacts,
        uploadCSV,
        getContacts,
        clearContacts,
        // Monitoring
        getQueueStatus,
        getCampaignStats,
        getCampaignAnalytics,
    };
}
