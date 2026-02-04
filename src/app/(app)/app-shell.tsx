'use client';

import React from 'react';
import { Toaster } from 'sonner';

import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/contexts/auth-context';
import { CampaignProvider } from '@/app/contexts/campaign-context';
import { MonadeUserProvider } from '@/app/hooks/use-monade-user';
import { TranscriptsProvider } from '@/app/hooks/use-transcripts-context';
import { AssistantsProvider } from '@/app/hooks/use-assistants-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MonadeUserProvider>
        <div className="flex h-screen">
          <Toaster richColors position="bottom-center" />
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <TranscriptsProvider>
              <AssistantsProvider>
                <CampaignProvider>{children}</CampaignProvider>
              </AssistantsProvider>
            </TranscriptsProvider>
          </main>
        </div>
      </MonadeUserProvider>
    </AuthProvider>
  );
}
