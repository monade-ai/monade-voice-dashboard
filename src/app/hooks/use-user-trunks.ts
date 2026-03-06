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

export function useUserTrunks() {
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
            const outboundData = await fetchJson<any>(
                `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks`,
                { retry: { retries: 1 } },
            );
            const inboundData = await fetchJson<any>(
                `${API_BASE}/api/users/${encodeURIComponent(userUid)}/inbound-trunks`,
                { retry: { retries: 1 } },
            );

            const outboundList = Array.isArray(outboundData) ? outboundData
                : (outboundData.trunks && Array.isArray(outboundData.trunks)) ? outboundData.trunks
                    : [];
            const inboundList = Array.isArray(inboundData) ? inboundData
                : (inboundData.trunks && Array.isArray(inboundData.trunks)) ? inboundData.trunks
                    : [];

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
    }, [userUid]);

    const createTrunk = useCallback(async (data: CreateTrunkData): Promise<UserTrunk | null> => {
        if (!userUid) return null;
        setSaving(true);
        try {
            const trunkType = data.trunk_type === 'inbound' ? 'inbound' : 'outbound';
            const endpoint = trunkType === 'inbound'
                ? `${API_BASE}/api/users/${encodeURIComponent(userUid)}/inbound-trunks`
                : `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks`;
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
    }, [userUid, fetchTrunks]);

    const updateTrunk = useCallback(async (trunk: UserTrunk, data: UpdateTrunkData): Promise<UserTrunk | null> => {
        if (!userUid) return null;
        setSaving(true);
        try {
            const isInbound = trunk.trunk_type === 'inbound';
            const trunkRef = encodeURIComponent(trunk.livekit_trunk_id || trunk.id);
            const endpoint = isInbound
                ? `${API_BASE}/api/users/${encodeURIComponent(userUid)}/inbound-trunks/${trunkRef}`
                : `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks/${trunkRef}`;
            const result = await fetchJson<UserTrunk>(
                endpoint,
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

    const unlinkTrunk = useCallback(async (trunk: UserTrunk): Promise<boolean> => {
        if (!userUid) return false;
        setSaving(true);
        try {
            const isInbound = trunk.trunk_type === 'inbound';
            const trunkRef = encodeURIComponent(trunk.livekit_trunk_id || trunk.id);
            const endpoint = isInbound
                ? `${API_BASE}/api/users/${encodeURIComponent(userUid)}/inbound-trunks/${trunkRef}/unlink`
                : `${API_BASE}/api/users/${encodeURIComponent(userUid)}/trunks/${trunkRef}/unlink`;
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
