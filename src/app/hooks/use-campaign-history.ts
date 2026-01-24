'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMonadeUser } from './use-monade-user';

export interface CampaignRecord {
    id: string;
    name: string;
    createdAt: string;
    assistantName: string;
    fromNumber: string;
    totalContacts: number;
    completed: number;
    noAnswer: number;
    failed: number;
    results: {
        phoneNumber: string;
        calleeInfo: Record<string, string>;
        call_id: string;
        call_status: string;
        transcript: string;
        analyticsLoaded?: boolean;
        analytics?: {
            verdict?: string;
            confidence_score?: number;
            summary?: string;
            call_quality?: string;
            key_discoveries?: Record<string, any>;
        } | null;
    }[];
}

export function useCampaignHistory() {
    const { userUid } = useMonadeUser(); // Get logged-in user's ID
    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Create user-specific storage key
    const getStorageKey = useCallback(() => {
        if (!userUid) return null;
        return `monade_campaign_history_${userUid}`;
    }, [userUid]);

    // Load campaigns from localStorage
    useEffect(() => {
        const storageKey = getStorageKey();
        if (!storageKey) {
            setLoading(false);
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                setCampaigns(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Failed to load campaign history:', err);
        } finally {
            setLoading(false);
        }
    }, [getStorageKey]);

    // Save campaign
    const saveCampaign = useCallback((campaign: Omit<CampaignRecord, 'id' | 'createdAt'>) => {
        const newCampaign: CampaignRecord = {
            ...campaign,
            id: `campaign_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        console.log('[CampaignHistory] Saving campaign:', {
            id: newCampaign.id,
            name: newCampaign.name,
            totalContacts: newCampaign.totalContacts,
            completed: newCampaign.completed,
            resultsLength: newCampaign.results?.length || 0,
            firstResult: newCampaign.results?.[0]
        });

        const storageKey = getStorageKey();
        if (!storageKey) {
            console.warn('[CampaignHistory] Cannot save - no user ID');
            return '';
        }

        setCampaigns(prev => {
            const updated = [newCampaign, ...prev].slice(0, 50); // Keep last 50 campaigns
            try {
                const jsonData = JSON.stringify(updated);
                console.log('[CampaignHistory] localStorage data size:', jsonData.length, 'bytes');
                localStorage.setItem(storageKey, jsonData);
            } catch (err) {
                console.error('[CampaignHistory] Failed to save to localStorage:', err);
                // If localStorage is full, try removing old campaigns
                const reduced = [newCampaign, ...prev.slice(0, 10)];
                localStorage.setItem(storageKey, JSON.stringify(reduced));
            }
            return updated;
        });

        return newCampaign.id;
    }, [getStorageKey]);

    // Delete campaign
    const deleteCampaign = useCallback((id: string) => {
        const storageKey = getStorageKey();
        if (!storageKey) return;

        setCampaigns(prev => {
            const updated = prev.filter(c => c.id !== id);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [getStorageKey]);

    // Get campaign by ID
    const getCampaign = useCallback((id: string) => {
        return campaigns.find(c => c.id === id);
    }, [campaigns]);

    // Get connectivity rate for a campaign
    const getConnectivityRate = useCallback((campaign: CampaignRecord) => {
        if (campaign.totalContacts === 0) return 0;
        return Math.round((campaign.completed / campaign.totalContacts) * 100);
    }, []);

    return {
        campaigns,
        loading,
        saveCampaign,
        deleteCampaign,
        getCampaign,
        getConnectivityRate,
    };
}
