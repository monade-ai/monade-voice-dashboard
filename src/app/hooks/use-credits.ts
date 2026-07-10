'use client';

import { useState, useEffect, useCallback } from 'react';

import { fetchJson } from '@/lib/http';
import {
  createScopedCacheKey,
  getCurrentOrganizationId,
  readLocalCache,
  writeLocalCache,
} from '@/lib/utils/client-cache';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

import { useMonadeUser } from './use-monade-user';

interface UserCredits {
    user_uid: string;
    available_credits: number;
    total_credits: number;
}

interface UseCreditsReturn {
    credits: UserCredits | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const CREDITS_CACHE_RESOURCE = 'user-credits';
const CREDITS_CACHE_TTL_MS = 60_000;

export function useCredits(): UseCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use dynamic userUid from MonadeUser context
  const { userUid, loading: userLoading } = useMonadeUser();

  const fetchCredits = useCallback(async (forceRefresh = false) => {
    if (!userUid) {
      if (!userLoading) {
        setError('User not authenticated');
      }
      setLoading(false);

      return;
    }

    const cacheKey = createScopedCacheKey(
      { userUid, organizationId: getCurrentOrganizationId() },
      CREDITS_CACHE_RESOURCE,
      { userUid },
    );
    if (!forceRefresh) {
      const cached = readLocalCache<UserCredits>(cacheKey);
      if (cached) {
        setCredits(cached.value);
        setError(null);
        setLoading(false);

        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchJson<UserCredits>(
        `${MONADE_API_CONFIG.BASE_URL}/api/users/${userUid}/credits`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      setCredits(data);
      writeLocalCache(cacheKey, data, CREDITS_CACHE_TTL_MS);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  }, [userUid, userLoading]);

  useEffect(() => {
    if (userUid) {
      fetchCredits();
    }
  }, [fetchCredits, userUid]);

  return {
    credits,
    loading: loading || userLoading,
    error,
    refetch: () => fetchCredits(true),
  };
}

export default useCredits;
