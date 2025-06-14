'use client';

import { Suspense } from 'react';

import { Card } from '@/components/ui/card';

import { AssistantsProvider } from '../hooks/use-assistants-context';
import { KnowledgeBaseProvider } from "../hooks/use-knowledge-base";
import { ContactsProvider } from '../contacts/contexts/contacts-context';

import AssistantsHeader from './components/assistants-header';
import AssistantTabs from './components/assistant-tabs';

import { useState } from 'react';

export default function AssistantsPage() {
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);

  return (
    <KnowledgeBaseProvider>
      <ContactsProvider>
        <AssistantsProvider>
          <div className="flex flex-col h-full">
            {/* Header with assistant selection */}
            <AssistantsHeader
              editingAssistantId={editingAssistantId}
              setEditingAssistantId={setEditingAssistantId}
            />

            {/* Main content area */}
            <div className="flex-1 p-4 bg-[var(--background)]">
              <Suspense fallback={<div className="p-8 text-center">Loading assistant details...</div>}>
                <Card className="bg-[var(--card)] rounded-lg shadow-sm p-6">
                  <AssistantTabs
                    editingAssistantId={editingAssistantId}
                  />
                </Card>
              </Suspense>
            </div>
          </div>
        </AssistantsProvider>
      </ContactsProvider>
    </KnowledgeBaseProvider>
  );
}
