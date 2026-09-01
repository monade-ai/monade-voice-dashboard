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

    // GET /trunks lists the whole trunks table, inbound rows included, so the endpoint
    // alone can't decide direction — trust the row's own trunk_type and fall back to the
    // endpoint's direction only when the column is absent.
    const resolveTrunkType = (trunk: any, fallback: 'inbound' | 'outbound'): 'inbound' | 'outbound' => (
      trunk?.trunk_type === 'inbound' || trunk?.trunk_type === 'outbound' ? trunk.trunk_type : fallback
    );

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

            const outboundList = getTrunkList(outboundData);
            const inboundList = getTrunkList(inboundData);

            // Keyed by id + resolved direction so inbound and outbound records stay separate
            // even when their DB ids match. An inbound row seen in the /trunks response lands
            // on the same key as its /inbound-trunks record, which then overwrites it — that
            // one is authoritative and carries livekit_trunk_id, allowed_numbers and krisp.
            const mergedByKey = new Map<string, UserTrunk>();
            outboundList.forEach((trunk) => {
                const trunkType = resolveTrunkType(trunk, 'outbound');
                mergedByKey.set(`${trunk.id}:${trunkType}`, { ...trunk, trunk_type: trunkType });
            });
            inboundList.forEach((trunk) => {
                mergedByKey.set(`${trunk.id}:inbound`, { ...trunk, trunk_type: 'inbound' });
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
