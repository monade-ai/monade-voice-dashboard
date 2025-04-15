'use client';

import React from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CreateAssistantButton() {
  const handleCreateAssistant = () => {
    // Implement create assistant logic here
    console.log('Creating new assistant...');
  };

  return (
    <Button
      onClick={handleCreateAssistant}
      className="bg-amber-600 text-white hover:bg-amber-700"
    >
      <Plus className="h-4 w-4 mr-2" />
      Create Assistant
    </Button>
  );
}