'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
    // Separated lists for easy retry of not-connected calls
    connectedResults?: {
        phoneNumber: string;
        calleeInfo: Record<string, string>;
        call_id: string;
        transcript: string;
        analytics?: any;
    }[];
    notConnectedResults?: {
        phoneNumber: string;
        calleeInfo: Record<string, string>;
        call_status: string; // 'no_answer' or 'failed'
    }[];
}

const STORAGE_PREFIX = 'monade_campaign_history_';

export function useCampaignHistory() {
    const { userUid, loading: userLoading } = useMonadeUser();
    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Use ref to always have current userUid in callbacks
    const userUidRef = useRef(userUid);
    useEffect(() => {
        userUidRef.current = userUid;
    }, [userUid]);

    // Get storage key for current user
    const getStorageKey = useCallback(() => {
        const uid = userUidRef.current;
        if (!uid) {
            console.warn('[CampaignHistory] No userUid available');
            return null;
        }
        return `${STORAGE_PREFIX}${uid}`;
    }, []);

    // Load campaigns from localStorage
    useEffect(() => {
        if (userLoading) return;
        if (!userUid) {
            setLoading(false);
            return;
        }

        const storageKey = `${STORAGE_PREFIX}${userUid}`;
        try {
            const stored = localStorage.getItem(storageKey);
            console.log('[CampaignHistory] Loading from:', storageKey, 'found:', !!stored);
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('[CampaignHistory] Loaded campaigns:', parsed.length);
                setCampaigns(parsed);
            }
        } catch (err) {
            console.error('Failed to load campaign history:', err);
        } finally {
            setLoading(false);
        }
    }, [userUid, userLoading]);

    // Save campaign
    const saveCampaign = useCallback((campaign: Omit<CampaignRecord, 'id' | 'createdAt'>) => {
        const uid = userUidRef.current;
        if (!uid) {
            console.error('[CampaignHistory] Cannot save - no user ID available');
            return '';
        }

        const storageKey = `${STORAGE_PREFIX}${uid}`;
        const newCampaign: CampaignRecord = {
            ...campaign,
            id: `campaign_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        console.log('[CampaignHistory] Saving campaign to:', storageKey, {
            id: newCampaign.id,
            name: newCampaign.name,
            totalContacts: newCampaign.totalContacts,
            completed: newCampaign.completed,
            resultsLength: newCampaign.results?.length || 0,
        });

        setCampaigns(prev => {
            const updated = [newCampaign, ...prev].slice(0, 50); // Keep last 50
            try {
                const jsonData = JSON.stringify(updated);
                console.log('[CampaignHistory] Saving to localStorage, size:', jsonData.length, 'bytes');
                localStorage.setItem(storageKey, jsonData);
                console.log('[CampaignHistory] Save successful!');
            } catch (err) {
                console.error('[CampaignHistory] Failed to save:', err);
                // If storage full, try with fewer campaigns
                try {
                    const reduced = [newCampaign, ...prev.slice(0, 5)];
                    localStorage.setItem(storageKey, JSON.stringify(reduced));
                    return reduced;
                } catch (e2) {
                    console.error('[CampaignHistory] Even reduced save failed:', e2);
                }
            }
            return updated;
        });

        return newCampaign.id;
    }, []);

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

    // Get connectivity rate
    const getConnectivityRate = useCallback((campaign: CampaignRecord) => {
        if (campaign.totalContacts === 0) return 0;
        return Math.round((campaign.completed / campaign.totalContacts) * 100);
    }, []);

    return {
        campaigns,
        loading: loading || userLoading,
        saveCampaign,
        deleteCampaign,
        getCampaign,
        getConnectivityRate,
    };
}
