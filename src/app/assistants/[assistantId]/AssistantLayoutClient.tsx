'use client';

import React from 'react';

interface AssistantLayoutClientProps {
  children: React.ReactNode;
  assistantId: string;
}

export default function AssistantLayoutClient({ children, assistantId }: AssistantLayoutClientProps) {
  return (
    <div className="container mx-auto">
      {/* Layout wrapper for assistant pages, assistantId: {assistantId} */}
      <div className="min-h-screen bg-[var(--background)]">
        {children}
      </div>
    </div>
  );
}
