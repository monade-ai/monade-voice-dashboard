// src/app/client-layout.tsx
'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

import { TranslationsProvider } from '@/i18n/translations-context';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider, useAuth } from '@/contexts/auth-context'; // Import the new AuthProvider

import { Sidebar } from '../components/sidebar';

import { PipecatProvider } from './assistants/providers/pipcat-provider';
import { AssistantsProvider } from './hooks/use-assistants-context';

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  const isPublicPath = pathname === '/login';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user && !isPublicPath) {
    // The middleware should handle the redirect. We render null here to prevent any flashing of the page content.
    return null;
  }

  return <>{children}</>;
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Memoize QueryClient so it's not recreated on every render
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TranslationsProvider>
        <AuthProvider> {/* Wrap with the new AuthProvider */}
          <ThemeProvider>
            <AuthWrapper>
              <div className="flex h-screen">
                <Toaster richColors position="bottom-center" />
                {/* Sidebar visibility now handled within Sidebar component */}
                <Sidebar />
                <main className="flex-1 overflow-auto">
                  <AssistantsProvider>
                    <PipecatProvider>{children}</PipecatProvider>
                  </AssistantsProvider>
                </main>
              </div>
            </AuthWrapper>
          </ThemeProvider>
        </AuthProvider>
      </TranslationsProvider>
    </QueryClientProvider>
  );
}
