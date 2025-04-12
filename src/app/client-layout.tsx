// src/app/client-layout.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../components/sidebar';
import { Toaster } from 'sonner';
import { PipecatProvider } from './assistants/providers/pipcat-provider';
import { TranslationsProvider } from '@/i18n/translations-context';

const noSidebarRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  // '/forgot-password',
  // '/admin/login',
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = noSidebarRoutes.includes(pathname);

  return (
    <TranslationsProvider>
      <div className="flex h-screen">
        <Toaster richColors position="bottom-center" />
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto bg-[#f8f5f0] text-gray-800">
          <PipecatProvider>{children}</PipecatProvider>
        </main>
      </div>
    </TranslationsProvider>
  );
}