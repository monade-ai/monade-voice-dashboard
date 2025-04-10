// app/client-layout.tsx (Client Component)
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../components/sidebar';
import { Toaster } from 'sonner';
import { PipecatProvider } from './assistants/providers/pipcat-provider';

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
    <div className="flex h-screen">
      <Toaster richColors position="bottom-center" />
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 overflow-auto bg-[#f8f5f0] text-gray-800">
        <PipecatProvider>{children}</PipecatProvider>
      </main>
    </div>
  );
}
