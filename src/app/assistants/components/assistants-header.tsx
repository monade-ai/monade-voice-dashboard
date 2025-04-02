'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAssistants } from '../../hooks/use-assistants-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import AssistantDualButton from './assistant-dual-button';
import AssistantNameEdit from './assistant-name-edit';
import { Badge } from '@/components/ui/badge';

export default function AssistantsHeader() {
  const { 
    assistants, 
    currentAssistant, 
    setCurrentAssistant, 
    addAssistant,
    updateAssistant,
    isCreatingNew,
    setIsCreatingNew 
  } = useAssistants();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);

  // Filter assistants based on search term
  const filteredAssistants = assistants.filter(
    assistant => assistant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateAssistant = () => {
    const newAssistant = {
      id: uuidv4(),
      name: 'New Assistant',
      description: '',
      model: '',
      provider: 'openai',
      voice: '',
      costPerMin: 0.1,
      latencyMs: 1000,
      tags: ['web'],
      createdAt: new Date(),
    };
    
    addAssistant(newAssistant);
    setCurrentAssistant(newAssistant);
    setIsCreatingNew(true);
  };

  return (
    <div className="border-b bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Assistants</h1>
        
        {currentAssistant && (
          <AssistantDualButton assistant={currentAssistant} />
        )}
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
      </div>

      {/* Horizontal scrolling assistant cards */}
      <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-thin scrollbar-thumb-amber-200">
        {filteredAssistants.map(assistant => (
          <div
            key={assistant.id}
            className={`flex-shrink-0 p-3 rounded-md border transition-colors min-w-[200px] text-left ${
              currentAssistant?.id === assistant.id
                ? 'bg-amber-100 border-amber-300'
                : 'bg-white hover:bg-amber-50 border-gray-200'
            }`}
          >
            <div 
              onClick={() => {
                if (editingAssistantId !== assistant.id) {
                  setCurrentAssistant(assistant);
                  setIsCreatingNew(false);
                }
              }}
              className="cursor-pointer"
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
                  onSave={(newName) => {
                    updateAssistant(assistant.id, { name: newName });
                    setEditingAssistantId(null);
                  }}
                  onCancel={() => setEditingAssistantId(null)}
                />
              </div>
              <div className="text-sm text-gray-500 truncate">{assistant.description || 'No description'}</div>
              
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
        ))}
      </div>
    </div>
  );
}