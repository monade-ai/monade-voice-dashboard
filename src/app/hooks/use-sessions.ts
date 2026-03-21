'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { fetchJson } from '@/lib/http';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { SESSION_MANAGER_URL } from '@/config';

const SESSION_API_BASE = SESSION_MANAGER_URL;
const REFRESH_INTERVAL_MS = 10_000;

export interface ActiveSession {
    phone_number: string;
    target_phone_number?: string;
    room_name: string;
    call_id: string;
    call_direction?: 'outbound' | 'inbound' | 'unknown';
    duration_seconds: number;
    started_at: string;
}

export type DisconnectMode = 'instant' | 'graceful';

export function useSessions() {
    const { userUid } = useMonadeUser();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchSessions = useCallback(async () => {
        if (!userUid) {
            setSessions([]);
            setLoading(false);
            return;
        }

        try {
            const data = await fetchJson<any>(
                `${SESSION_API_BASE}/sessions/${encodeURIComponent(userUid)}`,
                { retry: { retries: 1 } },
            );

            const sessionList = Array.isArray(data) ? data
                : Array.isArray(data.active_sessions) ? data.active_sessions
                    : Array.isArray(data.sessions) ? data.sessions
                        : [];
            setSessions(sessionList);
            setError(null);
        } catch (err) {
            console.error('[useSessions] Error fetching sessions:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    }, [userUid]);

    const disconnectSession = useCallback(async (roomName: string, mode: DisconnectMode = 'instant'): Promise<boolean> => {
        if (!userUid) return false;
        setDisconnecting(roomName);
        try {
            const endpoint = mode === 'graceful'
                ? `${SESSION_API_BASE}/sessions/${encodeURIComponent(userUid)}/disconnect/graceful`
                : `${SESSION_API_BASE}/sessions/${encodeURIComponent(userUid)}/disconnect/instant`;
            await fetchJson(
                endpoint,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'manual_disconnect' }),
                    retry: { retries: 0 },
                },
            );
            // Remove from local list immediately
            setSessions(prev => prev.filter(s => s.room_name !== roomName));
            return true;
        } catch (err) {
            console.error('[useSessions] Disconnect error:', err);
            setError(err instanceof Error ? err.message : 'Failed to disconnect session');
            return false;
        } finally {
            setDisconnecting(null);
        }
    }, [userUid]);

    const disconnectByPhone = useCallback(async (phoneNumber: string, mode: DisconnectMode = 'instant'): Promise<boolean> => {
        if (!userUid) return false;
        setDisconnecting(phoneNumber);
        try {
            await fetchJson(
                `${SESSION_API_BASE}/sessions/${encodeURIComponent(userUid)}/disconnect/by-phone/${encodeURIComponent(phoneNumber)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode, reason: 'user_requested' }),
                    retry: { retries: 0 },
                },
            );
            setSessions(prev => prev.filter(s => s.target_phone_number !== phoneNumber && s.phone_number !== phoneNumber));
            return true;
        } catch (err) {
            console.error('[useSessions] Disconnect by phone error:', err);
            setError(err instanceof Error ? err.message : 'Failed to disconnect session');
            return false;
        } finally {
            setDisconnecting(null);
        }
    }, [userUid]);

    // Auto-refresh
    useEffect(() => {
        fetchSessions();
        intervalRef.current = setInterval(fetchSessions, REFRESH_INTERVAL_MS);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchSessions]);

    return {
        sessions,
        loading,
        error,
        disconnecting,
        fetchSessions,
        disconnectSession,
        disconnectByPhone,
    };
}
