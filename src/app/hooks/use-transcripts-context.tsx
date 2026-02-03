'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { fetchJson } from '@/lib/http';
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
    has_conversation?: boolean;
}

interface TranscriptsContextType {
    transcripts: Transcript[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    lastFetched: number | null;
}

const TranscriptsContext = createContext<TranscriptsContextType | null>(null);

const CACHE_KEY = 'monade_transcripts_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Check if transcript has actual conversation
async function checkHasConversation(transcriptUrl: string): Promise<boolean> {
  try {
    const data = await fetchJson<{ messageCount?: number }>('/api/transcript-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: transcriptUrl }),
      retry: { retries: 2 },
    });
    return (data.messageCount || 0) > 0;
  } catch (err) {
    console.error('Error checking conversation:', err);
  }

  return false;
}

export function TranscriptsProvider({ children }: { children: React.ReactNode }) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const fetchingRef = useRef(false);

  const { userUid, loading: userLoading } = useMonadeUser();

  // Load from cache on mount
  useEffect(() => {
    if (!userUid) return;

    try {
      const cached = sessionStorage.getItem(`${CACHE_KEY}_${userUid}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_DURATION && Array.isArray(data)) {
          setTranscripts(data);
          setLastFetched(timestamp);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error loading cached transcripts:', err);
    }
  }, [userUid]);

  const fetchTranscripts = useCallback(async (forceRefresh = false) => {
    if (!userUid || fetchingRef.current) return;

    // If we have recent data and not forcing refresh, skip
    if (!forceRefresh && lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      setLoading(false);

      return;
    }

    fetchingRef.current = true;

    // Only show loading if no cached data
    if (transcripts.length === 0) {
      setLoading(true);
    }

    try {
      setError(null);

      const data = await fetchJson<any>(
        `${MONADE_API_CONFIG.BASE_URL}/api/users/${userUid}/transcripts`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MONADE_API_CONFIG.API_KEY,
          },
        },
      );
      const transcriptList: Transcript[] = Array.isArray(data) ? data : data.transcripts || [];

      // Check conversation status for first 50 transcripts
      const transcriptsWithStatus = await Promise.all(
        transcriptList.slice(0, 50).map(async (t) => {
          const hasConversation = t.transcript_url
            ? await checkHasConversation(t.transcript_url)
            : false;

          return { ...t, has_conversation: hasConversation };
        }),
      );

      const remaining = transcriptList.slice(50).map(t => ({ ...t, has_conversation: undefined }));
      const allTranscripts = [...transcriptsWithStatus, ...remaining];

      setTranscripts(allTranscripts);
      setLastFetched(Date.now());

      // Save to cache
      sessionStorage.setItem(`${CACHE_KEY}_${userUid}`, JSON.stringify({
        data: allTranscripts,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transcripts');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userUid, lastFetched, transcripts.length]);

  // Initial fetch when user is available
  useEffect(() => {
    if (userUid && !userLoading) {
      fetchTranscripts();
    }
  }, [userUid, userLoading, fetchTranscripts]);

  const refetch = useCallback(async () => {
    await fetchTranscripts(true);
  }, [fetchTranscripts]);

  return (
    <TranscriptsContext.Provider value={{
      transcripts,
      loading: loading || userLoading,
      error,
      refetch,
      lastFetched,
    }}>
      {children}
    </TranscriptsContext.Provider>
  );
}

export function useTranscripts() {
  const context = useContext(TranscriptsContext);
  if (!context) {
    throw new Error('useTranscripts must be used within a TranscriptsProvider');
  }

  return context;
}

export type { TranscriptsContextType };
