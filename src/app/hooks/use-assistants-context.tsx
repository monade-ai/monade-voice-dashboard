'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

export const AssistantsProvider = ({ children }: { children: ReactNode }) => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Fetch assistants from backend on mount
  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        const res = await fetch('/api/assistants');
        if (!res.ok) throw new Error('Failed to fetch assistants');
        const data = await res.json();
        // Convert createdAt to Date if needed
        setAssistants(
          data.map((a: any) => ({
            ...a,
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
          }))
        );
      } catch (err) {
        // Fallback to sample data if fetch fails
        setAssistants(sampleAssistants);
        // Optionally log error
        // console.error('Error fetching assistants:', err);
      }
    };
    fetchAssistants();
  }, []);

  const addAssistant = async (assistant: Assistant) => {
    try {
      const res = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistant),
      });
      if (!res.ok) throw new Error('Failed to add assistant');
      const saved = await res.json();
      setAssistants((prev) => [...prev, { ...saved, createdAt: saved.createdAt ? new Date(saved.createdAt) : new Date() }]);
    } catch (err) {
      // Fallback: add locally if backend fails
      setAssistants((prev) => [...prev, assistant]);
      // Optionally log error
      // console.error('Error adding assistant:', err);
    }
  };

  const updateAssistant = async (id: string, updatedData: Partial<Assistant>) => {
    try {
      const res = await fetch(`/api/assistants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to update assistant');
      const updated = await res.json();
      setAssistants((prev) =>
        prev.map((assistant) =>
          assistant.id === id ? { ...assistant, ...updated, createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date() } : assistant,
        ),
      );
      if (currentAssistant?.id === id) {
        setCurrentAssistant((prev) => prev ? { ...prev, ...updated, createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date() } : null);
      }
    } catch (err) {
      // Fallback: update locally if backend fails
      setAssistants((prev) =>
        prev.map((assistant) =>
          assistant.id === id ? { ...assistant, ...updatedData } : assistant,
        ),
      );
      if (currentAssistant?.id === id) {
        setCurrentAssistant((prev) => prev ? { ...prev, ...updatedData } : null);
      }
      // Optionally log error
      // console.error('Error updating assistant:', err);
    }
  };

  const deleteAssistant = async (id: string) => {
    try {
      const res = await fetch(`/api/assistants/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete assistant');
      setAssistants((prev) => prev.filter((assistant) => assistant.id !== id));
      if (currentAssistant?.id === id) {
        setCurrentAssistant(null);
      }
    } catch (err) {
      // Fallback: delete locally if backend fails
      setAssistants((prev) => prev.filter((assistant) => assistant.id !== id));
      if (currentAssistant?.id === id) {
        setCurrentAssistant(null);
      }
      // Optionally log error
      // console.error('Error deleting assistant:', err);
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
