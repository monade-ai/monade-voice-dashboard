'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  role: string | null;
}

import { getRoleFromJWT } from './decodeJWT';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClientComponentClient();

    // Get initial session and try to refresh if missing
    const getSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      let accessToken: string | null = null;
      if (!data.session) {
        // Try to refresh session from localStorage
        await supabase.auth.refreshSession();
        const refreshed = await supabase.auth.getSession();
        setUser(refreshed.data.session?.user ?? null);
        accessToken = refreshed.data.session?.access_token ?? null;
      } else {
        setUser(data.session?.user ?? null);
        accessToken = data.session?.access_token ?? null;
      }
      setRole(accessToken ? getRoleFromJWT(accessToken) : null);
      setLoading(false);
    };
    getSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.access_token) {
        localStorage.setItem('access_token', session.access_token);
        setUser(session.user ?? null); 
        setRole(getRoleFromJWT(session.access_token));
      }
      console.log('[AuthProvider] Auth state changed:', session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
