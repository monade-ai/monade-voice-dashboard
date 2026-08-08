'use client';

import { useState, useCallback, useEffect } from 'react';

import { fetchJson } from '@/lib/http';
import { useMonadeUser } from '@/app/hooks/use-monade-user';

import { MONADE_API_BASE } from '@/config';

const API_BASE = MONADE_API_BASE;

const getTrunkList = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.trunks)) return data.trunks;
    if (Array.isArray(data?.inbound_trunks)) return data.inbound_trunks;
    if (Array.isArray(data?.outbound_trunks)) return data.outbound_trunks;
    if (Array.isArray(data?.data)) return data.data;

    return [];
};

const sameStringArray = (left: string[] = [], right: string[] = []) => (
    left.length === right.length && left.every((value, index) => value === right[index])
);

export interface UserTrunk {
    id: string;
    user_uid?: string;
    name: string;
    address?: string;
    numbers: string[];
    auth_username?: string;
    auth_password?: string;
    livekit_trunk_id?: string;
    trunk_type?: 'inbound' | 'outbound';
    allowed_numbers?: string[];
    krisp_enabled?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CreateTrunkData {
    trunk_type?: 'inbound' | 'outbound';
    name: string;
    address?: string;
    numbers: string[];
    auth_username?: string;
    auth_password?: string;
    allowed_numbers?: string[];
    krisp_enabled?: boolean;
}

export interface UpdateTrunkData {
    name?: string;
    address?: string;
    numbers?: string[];
    auth_username?: string;
    auth_password?: string;
    allowed_numbers?: string[];
    krisp_enabled?: boolean;
}

export function useUserTrunks(selfHosted: boolean = false) {
    const { userUid } = useMonadeUser();
    const [trunks, setTrunks] = useState<UserTrunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const normalizeOutboundTrunk = (trunk: any): UserTrunk => ({
      ...trunk,
      trunk_type: 'outbound',
    });

    const normalizeInboundTrunk = (trunk: any): UserTrunk => ({
      ...trunk,
      trunk_type: 'inbound',
    });

    const fetchTrunks = useCallback(async () => {
        if (!userUid) {
            setTrunks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const base = `${API_BASE}/api/users/${encodeURIComponent(userUid)}${selfHosted ? '/selfhosted-livekit' : ''}`;
            const outboundData = await fetchJson<any>(
                `${base}/trunks`,
                { retry: { retries: 1 } },
            );
            const inboundData = await fetchJson<any>(
                `${base}/inbound-trunks`,
                { retry: { retries: 1 } },
            );

            // Direction comes from the endpoint, not a possibly stale/missing payload field.
            // This keeps inbound and outbound records separate even when their DB ids match.
            const outboundList = getTrunkList(outboundData);
            const inboundList = getTrunkList(inboundData);

            const mergedByKey = new Map<string, UserTrunk>();
            outboundList.map(normalizeOutboundTrunk).forEach((trunk) => {
                mergedByKey.set(`${trunk.id}:outbound`, trunk);
            });
            inboundList.map(normalizeInboundTrunk).forEach((trunk) => {
                mergedByKey.set(`${trunk.id}:inbound`, trunk);
            });

            setTrunks(Array.from(mergedByKey.values()));
            setError(null);
        } catch (err) {
            console.error('[useUserTrunks] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch trunks');
        } finally {
            setLoading(false);
        }
    }, [userUid, selfHosted]);

    const createTrunk = useCallback(async (data: CreateTrunkData): Promise<UserTrunk | null> => {
        if (!userUid) return null;
        setSaving(true);
        try {
            const trunkType = data.trunk_type === 'inbound' ? 'inbound' : 'outbound';
            const base = `${API_BASE}/api/users/${encodeURIComponent(userUid)}${selfHosted ? '/selfhosted-livekit' : ''}`;
            const endpoint = trunkType === 'inbound'
                ? `${base}/inbound-trunks`
                : `${base}/trunks`;
            const payload = trunkType === 'inbound'
                ? {
                    name: data.name,
                    numbers: data.numbers,
                    allowed_numbers: data.allowed_numbers ?? [],
                    krisp_enabled: data.krisp_enabled ?? true,
                }
                : {
                    name: data.name,
                    address: data.address,
                    numbers: data.numbers,
                    auth_username: data.auth_username,
                    auth_password: data.auth_password,
                };
            const result = await fetchJson<UserTrunk>(
                endpoint,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
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
    }, [userUid, selfHosted, fetchTrunks]);

    const updateTrunk = useCallback(async (trunk: UserTrunk, data: UpdateTrunkData): Promise<UserTrunk | null> => {
        if (!userUid) return null;
        setSaving(true);
        try {
            const isInbound = trunk.trunk_type === 'inbound';
            if (isInbound && !trunk.livekit_trunk_id) {
                throw new Error('This inbound trunk is missing its LiveKit trunk ID and cannot be updated. Refresh the page and try again.');
            }
            const trunkRef = encodeURIComponent(isInbound ? trunk.livekit_trunk_id! : trunk.livekit_trunk_id || trunk.id);
            const base = `${API_BASE}/api/users/${encodeURIComponent(userUid)}${selfHosted ? '/selfhosted-livekit' : ''}`;
            const endpoint = isInbound
                ? `${base}/inbound-trunks/${trunkRef}`
                : `${base}/trunks/${trunkRef}`;

            // The inbound API is a partial update. Only send fields that actually changed.
            const payload = isInbound
                ? {
                    ...(data.name !== undefined && data.name !== trunk.name ? { name: data.name } : {}),
                    ...(data.numbers !== undefined && !sameStringArray(data.numbers, trunk.numbers) ? { numbers: data.numbers } : {}),
                    ...(data.allowed_numbers !== undefined && !sameStringArray(data.allowed_numbers, trunk.allowed_numbers) ? { allowed_numbers: data.allowed_numbers } : {}),
                    ...(data.krisp_enabled !== undefined && data.krisp_enabled !== trunk.krisp_enabled ? { krisp_enabled: data.krisp_enabled } : {}),
                }
                : data;

            if (Object.keys(payload).length === 0) return trunk;
            const result = await fetchJson<UserTrunk>(
                endpoint,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
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
    }, [userUid, selfHosted, fetchTrunks]);

    const unlinkTrunk = useCallback(async (trunk: UserTrunk): Promise<boolean> => {
        if (!userUid) return false;
        setSaving(true);
        try {
            const isInbound = trunk.trunk_type === 'inbound';
            if (isInbound && !trunk.livekit_trunk_id) {
                throw new Error('This inbound trunk is missing its LiveKit trunk ID and cannot be unlinked. Refresh the page and try again.');
            }
            const trunkRef = encodeURIComponent(isInbound ? trunk.livekit_trunk_id! : trunk.livekit_trunk_id || trunk.id);
            const base = `${API_BASE}/api/users/${encodeURIComponent(userUid)}${selfHosted ? '/selfhosted-livekit' : ''}`;
            const endpoint = isInbound
                ? `${base}/inbound-trunks/${trunkRef}/unlink`
                : `${base}/trunks/${trunkRef}/unlink`;
            await fetchJson(
                endpoint,
                { method: 'DELETE', retry: { retries: 0 } },
            );
            setTrunks(prev => prev.filter(t => !(t.id === trunk.id && t.trunk_type === trunk.trunk_type)));
            return true;
        } catch (err) {
            console.error('[useUserTrunks] Unlink error:', err);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [userUid, selfHosted]);

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
