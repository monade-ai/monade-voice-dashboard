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

      // Best-effort API key lookup from Better Auth key endpoints.
      try {
        const candidates = [
          `${MONADE_API_CONFIG.BASE_URL}/api/auth/api-key/list-api-keys`,
          `${MONADE_API_CONFIG.BASE_URL}/api/auth/api-key/list`,
        ];

        let keysData: any = null;
        let resolved = false;
        for (const endpoint of candidates) {
          try {
            keysData = await fetchJson<any>(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
            resolved = true;
            break;
          } catch (err) {
            if (!(err instanceof ApiError) || err.status !== 404) {
              throw err;
            }
          }
        }
        if (!resolved) {
          setApiKey(null);
          return;
        }

        const keys = Array.isArray(keysData)
          ? keysData
          : (Array.isArray(keysData?.api_keys) ? keysData.api_keys : (Array.isArray(keysData?.keys) ? keysData.keys : []));
        if (keys.length > 0) {
          const firstKey = keys[0]?.key || keys[0]?.api_key || keys[0]?.token || null;
          if (firstKey) {
            console.log('[MonadeUser] Found API key:', `${String(firstKey).substring(0, 20)}...`);
            setApiKey(String(firstKey));
          } else {
            // BetterAuth list endpoints can return masked metadata without raw key value.
            setApiKey(null);
          }
        } else {
          console.log('[MonadeUser] No API keys found for user');
          setApiKey(null);
        }
      } catch (keyErr) {
        console.warn('[MonadeUser] API key list unavailable:', keyErr);
        setApiKey(null);
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
