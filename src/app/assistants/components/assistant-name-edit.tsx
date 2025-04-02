'use client';

import { useState, useEffect, useRef } from 'react';
import { Assistant, useAssistants } from '../../hooks/use-assistants-context';
import { Input } from '@/components/ui/input';
import { Check, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssistantNameEditProps {
  assistant: Assistant;
  isEditing: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
  showEditButton?: boolean;
}

export default function AssistantNameEdit({ 
  assistant, 
  isEditing, 
  onSave, 
  onCancel,
  showEditButton = false
}: AssistantNameEditProps) {
  const { updateAssistant } = useAssistants();
  const [name, setName] = useState(assistant.name);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name when assistant changes
  useEffect(() => {
    setName(assistant.name);
    setError('');
  }, [assistant]);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      inputRef.current.select();
    }
  }, [isEditing]);

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return false;
    }
    
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters');
      return false;
    }
    
    if (name.trim().length > 50) {
      setError('Name must be less than 50 characters');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!validateName(trimmedName)) {
      return;
    }

    try {
      // Update the assistant name in context
      updateAssistant(assistant.id, { name: trimmedName });
      
      // Call the onSave callback
      onSave(trimmedName);
      
      // Show success toast
      toast.success('Assistant renamed', {
        description: `"${assistant.name}" renamed to "${trimmedName}"`,
        duration: 3000,
      });
    } catch (err) {
      setError('Failed to update the assistant name');
      console.error('Error updating assistant name:', err);
      
      toast.error('Failed to rename assistant', {
        description: 'Please try again',
        duration: 3000,
      });
    }
  };

  const handleCancel = () => {
    // Reset to the original name
    setName(assistant.name);
    setError('');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Display mode with optional edit button
  if (!isEditing) {
    return (
      <div className="flex items-center gap-1">
        <div className="font-medium truncate">{assistant.name}</div>
        {showEditButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(assistant.name); // This triggers the edit mode in parent
                  }}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-full"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Edit assistant name</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 px-2 py-1"
          placeholder="Assistant name"
        />
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                  disabled={!!error}
                >
                  <Check className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Save changes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Cancel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}
    </div>
  );
}