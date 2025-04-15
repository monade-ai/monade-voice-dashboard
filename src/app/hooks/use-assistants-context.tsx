'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define the Assistant type
export interface Assistant {
  id: string;
  name: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags?: string[];
  createdAt: Date;
}

// Context interface
interface AssistantsContextType {
  assistants: Assistant[];
  currentAssistant: Assistant | null;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  addAssistant: (assistant: Assistant) => void;
  updateAssistant: (id: string, updatedData: Partial<Assistant>) => void;
  deleteAssistant: (id: string) => void;
  isCreatingNew: boolean;
  setIsCreatingNew: (value: boolean) => void;
}

// Create context with default values
export const AssistantsContext = createContext<AssistantsContextType>({
  assistants: [],
  currentAssistant: null,
  setCurrentAssistant: () => {},
  addAssistant: () => {},
  updateAssistant: () => {},
  deleteAssistant: () => {},
  isCreatingNew: false,
  setIsCreatingNew: () => {},
});

// Sample data for initial state
const sampleAssistants: Assistant[] = [
  {
    id: '76c88715-6a59-4001-9d8c-f2882730a5d2',
    name: 'New Assistant',
    description: 'alloy',
    model: 'tts-1',
    provider: 'openai',
    voice: 'alloy',
    costPerMin: 0.11,
    latencyMs: 1800,
    tags: ['Calllive Fixed Cost', 'Hindi tts', 'gpt-4.5 preview', 'openai', 'web'],
    createdAt: new Date(),
  },
];

// Provider component
export const AssistantsProvider = ({ children }: { children: ReactNode }) => {
  const [assistants, setAssistants] = useState<Assistant[]>(sampleAssistants);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const addAssistant = (assistant: Assistant) => {
    setAssistants((prev) => [...prev, assistant]);
  };

  const updateAssistant = (id: string, updatedData: Partial<Assistant>) => {
    setAssistants((prev) =>
      prev.map((assistant) =>
        assistant.id === id ? { ...assistant, ...updatedData } : assistant,
      ),
    );
    
    // Update current assistant if it's the one being modified
    if (currentAssistant?.id === id) {
      setCurrentAssistant((prev) => prev ? { ...prev, ...updatedData } : null);
    }
  };

  const deleteAssistant = (id: string) => {
    setAssistants((prev) => prev.filter((assistant) => assistant.id !== id));
    
    // Clear current assistant if it's the one being deleted
    if (currentAssistant?.id === id) {
      setCurrentAssistant(null);
    }
  };

  return (
    <AssistantsContext.Provider
      value={{
        assistants,
        currentAssistant,
        setCurrentAssistant,
        addAssistant,
        updateAssistant,
        deleteAssistant,
        isCreatingNew,
        setIsCreatingNew,
      }}
    >
      {children}
    </AssistantsContext.Provider>
  );
};

// Custom hook for using the context
export const useAssistants = () => useContext(AssistantsContext);