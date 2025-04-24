'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the Assistant type
export interface Assistant {
  id: string;
  name: string;
  phoneNumber?: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags?: string[];
  createdAt: Date;
}

interface AssistantsContextType {
  assistants: Assistant[];
  currentAssistant: Assistant | null;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  addAssistant: (assistant: Omit<Assistant, 'id' | 'createdAt'>) => Promise<void>;
  updateAssistant: (id: string, updatedData: Partial<Assistant>) => Promise<void>;
  deleteAssistant: (id: string) => Promise<void>;
  fetchAssistants: () => Promise<void>;
  isCreatingNew: boolean;
  setIsCreatingNew: (value: boolean) => void;
}

// Create context with default values
export const AssistantsContext = createContext<AssistantsContextType>({
  assistants: [],
  currentAssistant: null,
  setCurrentAssistant: () => {},
  addAssistant: async () => {},
  updateAssistant: async () => {},
  deleteAssistant: async () => {},
  fetchAssistants: async () => {},
  isCreatingNew: false,
  setIsCreatingNew: () => {},
});

const ASSISTANTS_API_BASE_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ASSISTANTS_API_BASE_URL
    ? process.env.NEXT_PUBLIC_ASSISTANTS_API_BASE_URL
    : '/api/assistants';

// Sample data for initial state
const sampleAssistants: Assistant[] = [
  {
    id: '76c88715-6a59-4001-9d8c-f2882730a5d2',
    name: 'New Assistant',
    phoneNumber: '',
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
  const fetchAssistants = async () => {
    try {
      const res = await fetch(ASSISTANTS_API_BASE_URL);
      if (!res.ok) throw new Error('Failed to fetch assistants');
      const data = await res.json();
      console.log('[Assistants] GET', ASSISTANTS_API_BASE_URL, 'Raw fetched:', data);
      const processed = data.map((a: any) => ({
        ...a,
        createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
      }));
      console.log('[Assistants] Processed list:', processed);
      setAssistants(processed);
    } catch (err) {
      // Fallback to sample data if fetch fails
      setAssistants(sampleAssistants);
      // Optionally log error
      // console.error('Error fetching assistants:', err);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const addAssistant = async (assistant: Omit<Assistant, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch(ASSISTANTS_API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistant),
      });
      if (!res.ok) throw new Error('Failed to add assistant');
      // After successful creation, re-fetch the assistants list
      await fetchAssistants();
    } catch (err) {
      // Fallback: add locally if backend fails, but mark as unsynced (no id)
      setAssistants((prev) => [
        ...prev,
        {
          ...assistant,
          id: `local-${Date.now()}`,
          createdAt: new Date(),
        } as Assistant,
      ]);
      // Optionally log error
      // console.error('Error adding assistant:', err);
    }
  };

  const updateAssistant = async (id: string, updatedData: Partial<Assistant>) => {
    // Prevent update if id is a local/unsynced assistant
    if (id.startsWith('local-')) {
      // Optionally show a warning or error in the UI
      return;
    }
    try {
      const url = `${ASSISTANTS_API_BASE_URL}/${id}`;
      console.log('[Assistants] PATCH', url, 'Payload:', updatedData);
      const res = await fetch(
        url,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        }
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Assistants] PATCH failed', res.status, errorText);
        throw new Error('Failed to update assistant');
      }
      // After successful update, re-fetch the assistants list
      await fetchAssistants();
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
    // Prevent delete if id is a local/unsynced assistant
    if (id.startsWith('local-')) {
      // Optionally show a warning or error in the UI
      setAssistants((prev) => prev.filter((assistant) => assistant.id !== id));
      if (currentAssistant?.id === id) {
        setCurrentAssistant(null);
      }
      return;
    }
    try {
      const res = await fetch(
        `${ASSISTANTS_API_BASE_URL}/${id}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error('Failed to delete assistant');
      // After successful delete, re-fetch the assistants list
      await fetchAssistants();
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
        fetchAssistants,
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
