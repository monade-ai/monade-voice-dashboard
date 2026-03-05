// 'use client';

// import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// import { User } from '@supabase/supabase-js';
// import { createClient } from '@/utils/supabase/client';
// import { useRouter } from 'next/navigation';

// interface AuthContextType {
//   user: User | null;
//   isLoading: boolean;
//   // Add organization context here if needed, e.g., currentOrganization: Organization | null;
//   // For now, focusing on basic user auth
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const supabase = createClient();
//   const router = useRouter();

//   const fetchUser = useCallback(async () => {
//     setIsLoading(true);
//     const { data: { user }, error } = await supabase.auth.getUser();
//     if (error) {
//       console.error('Error fetching user:', error.message);
//       setUser(null);
//     } else {
//       setUser(user);
//     }
//     setIsLoading(false);
//   }, [supabase]);

//   useEffect(() => {
//     fetchUser();

//     const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
//       console.log('Auth event:', event, session);
//       if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
//         setUser(session?.user || null);
//       } else if (event === 'SIGNED_OUT') {
//         setUser(null);
//         // Redirect to login page on sign out
//         router.push('/login');
//       }
//     });

//     return () => {
//       authListener.unsubscribe();
//     };
//   }, [fetchUser, supabase, router]);

//   return (
//     <AuthContext.Provider value={{ user, isLoading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };




'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

import { backendGetMe } from '@/lib/auth/backend-auth';

type AuthUser = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
};

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const me = await backendGetMe();
      setUser({
        id: me.user_uid,
        email: me.email,
        user_metadata: {
          full_name: me.name || me.email?.split('@')[0],
        },
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      await refreshAuth();
    };

    bootstrap();

    const onFocus = () => {
      if (!isMounted) return;
      refreshAuth();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshAuth }}>
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
