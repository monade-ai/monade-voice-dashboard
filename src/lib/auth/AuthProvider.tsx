'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabaseClient';

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and try to refresh if missing
    const getSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Try to refresh session from localStorage
        await supabase.auth.refreshSession();
        const refreshed = await supabase.auth.getSession();
        setUser(refreshed.data.session?.user ?? null);
      } else {
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    };
    getSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
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
