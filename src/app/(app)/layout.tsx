import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { AppShell } from './app-shell';
import { backendServerGetMe } from '@/lib/auth/backend-auth-server';

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await backendServerGetMe();
  } catch {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
