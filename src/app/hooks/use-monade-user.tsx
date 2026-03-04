'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { ApiError, fetchJson } from '@/lib/http';
import { useAuth } from '@/contexts/auth-context';

interface MonadeUserContextType {
    userUid: string | null;
    email: string | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const MonadeUserContext = createContext<MonadeUserContextType>({
  userUid: null,
  email: null,
  loading: true,
  error: null,
  refetch: async () => { },
});

export function useMonadeUser() {
  const context = useContext(MonadeUserContext);
  if (!context) {
    throw new Error('useMonadeUser must be used within a MonadeUserProvider');
  }

  return context;
}

interface MonadeUserProviderProps {
    children: React.ReactNode;
}

export function MonadeUserProvider({ children }: MonadeUserProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [userUid, setUserUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getApiErrorMessage = (status: number) => {
    if (status === 401 || status === 403) return 'You are not authorized to access this account.';
    if (status === 404) return 'User account not found. Please contact admin.';
    if (status >= 500) return 'Monade API is currently unavailable. Please try again later.';

    return 'Failed to fetch user account';
  };

  const fetchMonadeUser = useCallback(async () => {
    if (authLoading) {
      setLoading(true);

      return;
    }

    if (!user?.email) {
      setUserUid(null);
      setEmail(null);
      setError(null);
      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<any>('/api/proxy/api/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        retry: { retries: 1 },
      });

      if (!data?.user_uid) {
        setError('Invalid user profile response');
        setUserUid(null);
        setEmail(user.email);

        return;
      }

      setUserUid(data.user_uid);
      setEmail(data.email || user.email);
    } catch (fetchError) {
      if (fetchError instanceof ApiError) {
        setError(getApiErrorMessage(fetchError.status ?? 0));
      } else {
        setError('Could not reach Monade API. Please try again later.');
      }
      setUserUid(null);
      setEmail(user.email);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    fetchMonadeUser();
  }, [fetchMonadeUser]);

  return (
    <MonadeUserContext.Provider value={{ userUid, email, loading, error, refetch: fetchMonadeUser }}>
      {children}
    </MonadeUserContext.Provider>
  );
}
