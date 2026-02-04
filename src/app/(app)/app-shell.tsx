'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/contexts/auth-context';
import { CampaignProvider } from '@/app/contexts/campaign-context';
import { MonadeUserProvider } from '@/app/hooks/use-monade-user';
import { TranscriptsProvider } from '@/app/hooks/use-transcripts-context';
import { AssistantsProvider } from '@/app/hooks/use-assistants-context';

interface RouteSample {
  route: string;
  durationMs: number;
}

declare global {
  interface Window {
    __monadeRouteSamples?: RouteSample[];
  }
}

const ROUTE_SAMPLE_LIMIT = 100;

const percentile = (sortedValues: number[], p: number) => {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pendingNavRef = React.useRef<{ targetPath: string; startedAt: number } | null>(null);

  React.useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!event.isTrusted || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      if (href === window.location.pathname) return;

      pendingNavRef.current = { targetPath: href, startedAt: performance.now() };
    };

    document.addEventListener('click', onDocumentClick, true);

    return () => {
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, []);

  React.useEffect(() => {
    const pendingNav = pendingNavRef.current;
    if (!pendingNav || pendingNav.targetPath !== pathname) return;

    const durationMs = performance.now() - pendingNav.startedAt;
    const history = window.__monadeRouteSamples ?? [];
    const nextHistory = [...history, { route: pathname, durationMs }].slice(-ROUTE_SAMPLE_LIMIT);
    window.__monadeRouteSamples = nextHistory;

    const routeDurations = nextHistory
      .filter((sample) => sample.route === pathname)
      .map((sample) => sample.durationMs)
      .sort((a, b) => a - b);

    const p50 = percentile(routeDurations, 0.5);
    const p95 = percentile(routeDurations, 0.95);

    console.info(
      `[Perf][RouteSwitch] ${pathname} ${durationMs.toFixed(1)}ms | samples=${routeDurations.length} p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`,
    );

    pendingNavRef.current = null;
  }, [pathname]);

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
