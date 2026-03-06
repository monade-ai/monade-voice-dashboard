'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { backendGetMe } from '@/lib/auth/backend-auth';

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
  const [userUid, setUserUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
    <MonadeUserContext.Provider value={{ userUid, email, loading, error, refetch: fetchMonadeUser }}>
      {children}
    </MonadeUserContext.Provider>
  );
}
