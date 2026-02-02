'use client';

import { useState } from 'react';

interface AssistantsHeaderProps {
  editingAssistantId: string | null;
  setEditingAssistantId: (id: string | null) => void;
}
import { Search, Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useAssistants } from '../../hooks/use-assistants-context';

import AssistantNameEdit from './assistant-name-edit';
import { VoiceAssistantDialog } from './voice-assistant-dialog';

export default function AssistantsHeader({ editingAssistantId, setEditingAssistantId }: AssistantsHeaderProps) {
  const {
    assistants,
    currentAssistant,
    setCurrentAssistant,
    addDraftAssistant,
    updateAssistantLocally,
    fetchAssistants,
  } = useAssistants();

  const [searchTerm, setSearchTerm] = useState('');
  // editingAssistantId and setEditingAssistantId are now props from parent

  // Dialog open state for VoiceAssistantDialog
  const [dialogOpen, setDialogOpen] = useState(false);

  // RBAC
  // TODO: Replace with new Supabase-based permission check
  const canCreateAssistant = true; // Placeholder
  
  // Debug logging
  console.log('[AssistantsHeader] canCreateAssistant:', canCreateAssistant);
  console.log('[AssistantsHeader] checking permission: assistants.create');

  // Filter assistants based on search term
  const filteredAssistants = assistants.filter(
    assistant => assistant.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Open the dialog instead of creating a draft directly
  const handleCreateAssistant = () => {
    setDialogOpen(true);
  };

  // Handle selection from VoiceAssistantDialog
  const handleDialogSelect = (modelId: string) => {
    // Map modelId to price/latency and correct model/provider for API
    let costPerMin = 0;
    let latencyMs = 0;
    let modelName = '';
    let model = '';
    let provider = '';

    if (modelId === 'conversational') {
      costPerMin = 43;
      latencyMs = 678;
      modelName = 'Conversational';
      model = 'gemini';
      provider = 'google';
    } else if (modelId === 'professional') {
      costPerMin = 64;
      latencyMs = 730;
      modelName = 'Professional';
      model = 'elevenlabs-multilingual-v2';
      provider = 'elevenlabs';
    } else if (modelId === 'creative') {
      costPerMin = 78;
      latencyMs = 694;
      modelName = 'Creative';
      // Not selectable, but fallback for completeness
      model = 'creative';
      provider = 'openai';
    }

    const newDraftData = {
      name: `New ${modelName} Assistant`,
      description: '',
      model,
      provider,
      voice: '',
      costPerMin,
      latencyMs,
      tags: [],
      phoneNumber: '',
      knowledgeBase: null,
      contact_bucket_id: null,
    };

    const createdDraft = addDraftAssistant(newDraftData);
    setCurrentAssistant(createdDraft);
    setEditingAssistantId(createdDraft.id);
    setDialogOpen(false);
  };

  // Handle saving the name edit locally
  const handleSaveName = (assistantId: string, newName: string) => {
    updateAssistantLocally(assistantId, { name: newName });
    setEditingAssistantId(null);
  };

  return (
    <div className="border-b border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Assistants</h1>
      </div>

      <div className="flex space-x-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search Assistants"
            className="pl-8 bg-[var(--muted)] border-[var(--border)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {canCreateAssistant && (
          <Button
            onClick={handleCreateAssistant}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Assistant
          </Button>
        )}
        <VoiceAssistantDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSelect={handleDialogSelect}
        />
      </div>

      {/* Horizontal scrolling assistant cards */}
      <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-thin scrollbar-thumb-amber-200">
        {filteredAssistants.map(assistant => {
          const isDraft = assistant.id.startsWith('local-');

          return (
            <div
              key={assistant.id}
              className={`relative flex-shrink-0 p-3 rounded-md border transition-colors min-w-[200px] text-left ${currentAssistant?.id === assistant.id
                ? 'bg-[var(--muted)] border-[var(--primary)]'
                : 'bg-[var(--card)] hover:bg-[var(--muted)] border-[var(--border)]'
              }`}
            >
              {isDraft && (
                <Badge variant="outline" className="absolute top-1 right-1 bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)] text-xs px-1 py-0.5">
                  Draft
                </Badge>
              )}
              <div
                onClick={() => {
                  if (editingAssistantId !== assistant.id) {
                    setCurrentAssistant(assistant);
                  }
                }}
                className="cursor-pointer pt-2"
              >
                <AssistantNameEdit
                  assistant={assistant}
                  isEditing={editingAssistantId === assistant.id}
                  onSave={(newName) => handleSaveName(assistant.id, newName)}
                  onCancel={() => setEditingAssistantId(null)}
                  onStartEdit={() => setEditingAssistantId(assistant.id)}
                  showEditButton
                />
                <div className="text-sm text-[var(--muted-foreground)] truncate pt-1">{assistant.description || 'No description'}</div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {assistant.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="bg-[var(--muted)] text-xs py-0 px-1">
                      {tag}
                    </Badge>
                  ))}
                  {(assistant.tags?.length || 0) > 3 && (
                    <Badge variant="outline" className="bg-[var(--muted)] text-xs py-0 px-1">
                      +{(assistant.tags?.length || 0) - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
