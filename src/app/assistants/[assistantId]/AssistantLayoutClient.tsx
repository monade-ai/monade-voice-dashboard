'use client';

import React from 'react';

interface AssistantLayoutClientProps {
  children: React.ReactNode;
}

export default function AssistantLayoutClient({ children }: AssistantLayoutClientProps) {
  return (
    <div className="container mx-auto">
      <div className="min-h-screen bg-[var(--background)]">
        {children}
      </div>
    </div>
  );
}
