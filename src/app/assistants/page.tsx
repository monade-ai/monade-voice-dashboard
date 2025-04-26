'use client';

import { Suspense } from 'react';

import { Card } from '@/components/ui/card';

import { AssistantsProvider } from '../hooks/use-assistants-context';
import { KnowledgeBaseProvider } from "../hooks/use-knowledge-base";

import AssistantsHeader from './components/assistants-header';
import AssistantTabs from './components/assistant-tabs';

export default function AssistantsPage() {
  return (
    <KnowledgeBaseProvider>
      <AssistantsProvider>
        <div className="flex flex-col h-full">
          {/* Header with assistant selection */}
        <AssistantsHeader />
        
        {/* Main content area */}
        <div className="flex-1 p-4 bg-amber-50">
          <Suspense fallback={<div className="p-8 text-center">Loading assistant details...</div>}>
            <Card className="bg-white rounded-lg shadow-sm p-6">
              <AssistantTabs />
            </Card>
          </Suspense>
        </div>
      </div>
    </AssistantsProvider>
    </KnowledgeBaseProvider>
  );
}