// src/app/client-layout.tsx
'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

import { TranslationsProvider } from '@/i18n/translations-context';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context'; // Import the new AuthProvider

import { Sidebar } from '../components/sidebar';

import { PipecatProvider } from './assistants/providers/pipcat-provider';
import { AssistantsProvider } from './hooks/use-assistants-context';


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
          </ThemeProvider>
        </AuthProvider>
      </TranslationsProvider>
    </QueryClientProvider>
  );
}
