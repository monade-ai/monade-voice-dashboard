'use client';

import { useState, useCallback, useEffect } from 'react';

import { fetchJson } from '@/lib/http';
import { useMonadeUser } from '@/app/hooks/use-monade-user';

import { MONADE_API_BASE } from '@/config';

const API_BASE = MONADE_API_BASE;

export interface UserTrunk {
    id: string;
    user_uid?: string;
    name: string;
    address: string;
    numbers: string[];
    auth_username?: string;
    auth_password?: string;
    livekit_trunk_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateTrunkData {
    name: string;
    address: string;
    numbers: string[];
    auth_username?: string;
    auth_password?: string;
}

export interface UpdateTrunkData {
    name?: string;
    address?: string;
    numbers?: string[];
    auth_username?: string;
    auth_password?: string;
}

export function useUserTrunks() {
    const { userUid } = useMonadeUser();
    const [trunks, setTrunks] = useState<UserTrunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchTrunks = useCallback(async () => {
        if (!userUid) {
            setTrunks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await fetchJson<any>(
                `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks`,
                { retry: { retries: 1 } },
            );
            const list = Array.isArray(data) ? data
                : (data.trunks && Array.isArray(data.trunks)) ? data.trunks
                    : [];
            setTrunks(list);
            setError(null);
        } catch (err) {
            console.error('[useUserTrunks] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch trunks');
        } finally {
            setLoading(false);
        }
    }, [userUid]);

    const createTrunk = useCallback(async (data: CreateTrunkData): Promise<UserTrunk | null> => {
        if (!userUid) return null;
        setSaving(true);
        try {
            const result = await fetchJson<UserTrunk>(
                `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    retry: { retries: 0 },
                },
            );
            await fetchTrunks();
            return result;
        } catch (err) {
            console.error('[useUserTrunks] Create error:', err);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [userUid, fetchTrunks]);

    const updateTrunk = useCallback(async (trunkId: string, data: UpdateTrunkData): Promise<UserTrunk | null> => {
        if (!userUid) return null;
        setSaving(true);
        try {
            const result = await fetchJson<UserTrunk>(
                `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks/${encodeURIComponent(trunkId)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    retry: { retries: 0 },
                },
            );
            await fetchTrunks();
            return result;
        } catch (err) {
            console.error('[useUserTrunks] Update error:', err);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [userUid, fetchTrunks]);

    const unlinkTrunk = useCallback(async (trunkId: string): Promise<boolean> => {
        if (!userUid) return false;
        setSaving(true);
        try {
            await fetchJson(
                `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks/${encodeURIComponent(trunkId)}/unlink`,
                { method: 'DELETE', retry: { retries: 0 } },
            );
            setTrunks(prev => prev.filter(t => t.id !== trunkId));
            return true;
        } catch (err) {
            console.error('[useUserTrunks] Unlink error:', err);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [userUid]);

    useEffect(() => {
        fetchTrunks();
    }, [fetchTrunks]);

    return {
        trunks,
        loading,
        error,
        saving,
        fetchTrunks,
        createTrunk,
        updateTrunk,
        unlinkTrunk,
    };
}
