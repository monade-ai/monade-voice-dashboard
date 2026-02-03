'use client';

import { useState, useEffect, useCallback } from 'react';

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

export function useCredits(): UseCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use dynamic userUid from MonadeUser context
  const { userUid, loading: userLoading } = useMonadeUser();

  const fetchCredits = useCallback(async () => {
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
        `${MONADE_API_CONFIG.BASE_URL}/api/users/${userUid}/credits`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MONADE_API_CONFIG.API_KEY,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch credits: ${response.status}`);
      }

      const data = await response.json();
      setCredits(data);
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
    refetch: fetchCredits,
  };
}

export default useCredits;

