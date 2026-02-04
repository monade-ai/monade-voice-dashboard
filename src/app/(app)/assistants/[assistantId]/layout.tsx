import React, { use } from 'react';

import AssistantLayoutClient from './AssistantLayoutClient';

export type AssistantParams = Promise<{ assistantId: string }>;

export default function AssistantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: AssistantParams;
}) {
  const { assistantId } = use(params);

  return (
    <AssistantLayoutClient assistantId={assistantId}>
      {children}
    </AssistantLayoutClient>
  );
}
