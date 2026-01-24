'use client';

import { useState, useEffect, useCallback } from 'react';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';
import { useMonadeUser } from './use-monade-user';

export interface Transcript {
    id: string;
    user_uid: string;
    transcript_url: string;
    phone_number: string;
    call_id: string;
    created_at: string;
    updated_at: string;
    has_conversation?: boolean; // true if call has actual User/Agent turns
}

interface UseTranscriptsReturn {
    transcripts: Transcript[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Check if transcript has actual conversation (not just metadata)
async function checkHasConversation(transcriptUrl: string): Promise<boolean> {
    try {
        const response = await fetch('/api/transcript-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: transcriptUrl }),
        });
        if (response.ok) {
            const data = await response.json();
            return (data.messageCount || 0) > 0;
        }
    } catch (err) {
        console.error('Error checking conversation:', err);
    }
    return false;
}

export function useTranscripts(): UseTranscriptsReturn {
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use dynamic userUid from MonadeUser context
    const { userUid, loading: userLoading } = useMonadeUser();

    const fetchTranscripts = useCallback(async () => {
        if (!userUid) {
            if (!userLoading) {
                setError('User not authenticated');
            }
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
            const transcriptList: Transcript[] = Array.isArray(data) ? data : data.transcripts || [];

            // Check conversation status for recent transcripts (batch of first 50)
            const transcriptsWithStatus = await Promise.all(
                transcriptList.slice(0, 50).map(async (t) => {
                    const hasConversation = t.transcript_url
                        ? await checkHasConversation(t.transcript_url)
                        : false;
                    return { ...t, has_conversation: hasConversation };
                })
            );

            // For remaining transcripts, mark as unknown (they haven't been checked)
            const remaining = transcriptList.slice(50).map(t => ({ ...t, has_conversation: undefined }));

            setTranscripts([...transcriptsWithStatus, ...remaining]);
        } catch (err) {
            console.error('Error fetching transcripts:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch transcripts');
        } finally {
            setLoading(false);
        }
    }, [userUid, userLoading]);

    useEffect(() => {
        if (userUid) {
            fetchTranscripts();
        }
    }, [fetchTranscripts, userUid]);

    return {
        transcripts,
        loading: loading || userLoading,
        error,
        refetch: fetchTranscripts,
    };
}

export default useTranscripts;
