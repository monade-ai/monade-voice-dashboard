'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useAssistants } from '../../hooks/use-assistants-context';

import AssistantNameEdit from './assistant-name-edit';
import { VoiceAssistantDialog } from './voice-assistant-dialog';

export default function AssistantsHeader() {
  const {
    assistants,
    currentAssistant,
    setCurrentAssistant,
    addDraftAssistant,
    updateAssistantLocally,
    fetchAssistants,
  } = useAssistants();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);

  // Dialog open state for VoiceAssistantDialog
  const [dialogOpen, setDialogOpen] = useState(false);

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
    // Map modelId to price/latency
    let costPerMin = 0;
    let latencyMs = 0;
    let modelName = '';
    let provider = 'openai'; // default, can be changed if needed

    if (modelId === 'conversational') {
      costPerMin = 6;
      latencyMs = 678;
      modelName = 'Conversational';
    } else if (modelId === 'professional') {
      costPerMin = 9;
      latencyMs = 730;
      modelName = 'Professional';
    } else if (modelId === 'creative') {
      costPerMin = 16;
      latencyMs = 694;
      modelName = 'Creative';
    }

    const newDraftData = {
      name: `New ${modelName} Assistant`,
      description: '',
      model: modelId,
      provider,
      voice: '',
      costPerMin,
      latencyMs,
      tags: [],
      phoneNumber: '',
      knowledgeBase: null,
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
    <div className="border-b bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Assistants</h1>
        <Button
          variant="outline"
          className="ml-2 border-gray-300 text-gray-700"
          onClick={fetchAssistants}
          title="Refresh assistants list"
        >
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.5 19A9 9 0 1 1 19 5.5l-1.42 1.42" />
          </svg>
          Refresh
        </Button>
      </div>

      <div className="flex space-x-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search Assistants"
            className="pl-8 bg-gray-50 border-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          onClick={handleCreateAssistant}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Assistant
        </Button>
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
                ? 'bg-amber-100 border-amber-300'
                : 'bg-white hover:bg-amber-50 border-gray-200'
                }`}
            >
              {isDraft && (
                <Badge variant="outline" className="absolute top-1 right-1 bg-orange-100 text-orange-700 border-orange-300 text-xs px-1 py-0.5">
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
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAssistantId(assistant.id);
                  }}
                >
                  <AssistantNameEdit
                    assistant={assistant}
                    isEditing={editingAssistantId === assistant.id}
                    onSave={(newName) => handleSaveName(assistant.id, newName)}
                    onCancel={() => setEditingAssistantId(null)}
                  />
                </div>
                <div className="text-sm text-gray-500 truncate pt-1">{assistant.description || 'No description'}</div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {assistant.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="bg-amber-50 text-xs py-0 px-1">
                      {tag}
                    </Badge>
                  ))}
                  {(assistant.tags?.length || 0) > 3 && (
                    <Badge variant="outline" className="bg-amber-50 text-xs py-0 px-1">
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
