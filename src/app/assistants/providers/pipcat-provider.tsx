'use client';

import { RTVIClientProvider } from '@pipecat-ai/client-react';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { getClient } from '../lib/rtviClient';

export function PipecatProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<ReturnType<typeof getClient>>(null);

  useEffect(() => {
    setClient(getClient());
  }, []);

  if (!client) return <>{children}</>;

  return <RTVIClientProvider client={client}>{children}</RTVIClientProvider>;
}
