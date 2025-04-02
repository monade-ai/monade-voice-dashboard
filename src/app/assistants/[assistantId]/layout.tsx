'use client';

import React from 'react';

interface AssistantLayoutProps {
  children: React.ReactNode;
  params: {
    assistantId: string;
  };
}

export default function AssistantLayout({ children, params }: AssistantLayoutProps) {
  return (
    <div className="container mx-auto">
      {/* Layout wrapper for assistant pages */}
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </div>
  );
}