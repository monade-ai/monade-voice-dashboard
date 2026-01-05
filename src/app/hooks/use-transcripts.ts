'use client';

import { useState, useEffect, useCallback } from 'react';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

export interface Transcript {
    id: string;
    user_uid: string;
    transcript_url: string;
    phone_number: string;
    call_id: string;
    created_at: string;
    updated_at: string;
}

interface UseTranscriptsReturn {
    transcripts: Transcript[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useTranscripts(): UseTranscriptsReturn {
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userUid = MONADE_API_CONFIG.DEFAULT_USER_UID;

    const fetchTranscripts = useCallback(async () => {
        if (!userUid) {
            setError('User UID not configured');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `${MONADE_API_CONFIG.BASE_URL}/api/users/${userUid}/transcripts`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': MONADE_API_CONFIG.API_KEY,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch transcripts: ${response.status}`);
            }

            const data = await response.json();
            setTranscripts(Array.isArray(data) ? data : data.transcripts || []);
        } catch (err) {
            console.error('Error fetching transcripts:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch transcripts');
        } finally {
            setLoading(false);
        }
    }, [userUid]);

    useEffect(() => {
        fetchTranscripts();
    }, [fetchTranscripts]);

    return {
        transcripts,
        loading,
        error,
        refetch: fetchTranscripts,
    };
}

export default useTranscripts;
