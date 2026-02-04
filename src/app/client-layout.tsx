// src/app/client-layout.tsx
'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TranslationsProvider } from '@/i18n/translations-context';
import { ThemeProvider } from '@/components/theme-provider';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Memoize QueryClient so it's not recreated on every render
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TranslationsProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </TranslationsProvider>
    </QueryClientProvider>
  );
}
