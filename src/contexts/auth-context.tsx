'use client';

import { createContext, useContext, ReactNode } from 'react';

import { useSession } from '@/lib/auth/auth-client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, isPending } = useSession();
  const user = (session?.user ?? null) as AuthUser | null;

  return (
    <AuthContext.Provider value={{ user, isLoading: isPending }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
