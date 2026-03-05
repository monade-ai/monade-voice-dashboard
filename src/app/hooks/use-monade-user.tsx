'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { ApiError, fetchJson } from '@/lib/http';
import { backendGetMe } from '@/lib/auth/backend-auth';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

interface MonadeUserContextType {
    userUid: string | null;
    email: string | null;
    apiKey: string | null; // User's default API key for billing
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const MonadeUserContext = createContext<MonadeUserContextType>({
  userUid: null,
  email: null,
  apiKey: null,
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
  const [userUid, setUserUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getApiErrorMessage = (status: number) => {
    if (status === 401 || status === 403) return 'You are not authorized to access this account.';
    if (status === 404) return 'User account not found. Please contact admin.';
    if (status >= 500) return 'Monade API is currently unavailable. Please try again later.';

    return 'Failed to fetch user account';
  };

  const fetchMonadeUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let me: any = null;
      try {
        me = await backendGetMe();
      } catch {
        console.log('[MonadeUser] No authenticated user');
        setUserUid(null);
        setEmail(null);
        setApiKey(null);
        setLoading(false);
        return;
      }

      const uid = me.user_uid as string | undefined;
      const userEmail = me.email as string | undefined;
      setEmail(userEmail || null);

      if (!uid) {
        setError('Invalid user data');
        return;
      }

      console.log('[MonadeUser] Successfully fetched user_uid:', uid);
      setUserUid(uid);

      // Now fetch user's API keys
      try {
        const keysData = await fetchJson<any>(
          `${MONADE_API_CONFIG.BASE_URL}/api/users/${uid}/api-keys`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          },
        );

        const keys = Array.isArray(keysData) ? keysData : keysData.api_keys || [];
        if (keys.length > 0) {
          const firstKey = keys[0].key || keys[0].api_key || keys[0];
          console.log('[MonadeUser] Found API key:', firstKey ? `${String(firstKey).substring(0, 20)}...` : 'none');
          setApiKey(String(firstKey));
        } else {
          console.log('[MonadeUser] No API keys found for user');
          setApiKey(null);
        }
      } catch (keyErr) {
        console.error('[MonadeUser] Error fetching API keys:', keyErr);
        if (keyErr instanceof ApiError) {
          setError(getApiErrorMessage(keyErr.status ?? 0));
        } else {
          setError('Could not load API keys. Please try again later.');
        }
      }
    } catch (err) {
      console.error('[MonadeUser] Error fetching user:', err);
      setError('Failed to fetch user account');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonadeUser();
    const onFocus = () => fetchMonadeUser();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchMonadeUser]);

  return (
    <MonadeUserContext.Provider value={{ userUid, email, apiKey, loading, error, refetch: fetchMonadeUser }}>
      {children}
    </MonadeUserContext.Provider>
  );
}
