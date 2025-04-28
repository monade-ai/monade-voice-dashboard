'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/app/knowledge-base/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Define the Assistant type - Matches API GET response structure & Prisma Schema
export interface Assistant {
  id: string; // Can be 'local-...' for drafts or UUID for published
  name: string;
  phoneNumber: string; // Non-optional in DB, but might be empty in draft state initially
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags: string[]; // Non-optional (defaults to [])
  createdAt: Date; // Represents local creation time for drafts, API time for published
  knowledgeBase?: string | null; // Stores the URL from GET, or null
}

// Define the structure for creating an assistant (maps to POST body)
// Explicitly define fields matching API requirements
type CreateAssistantData = {
  name: string; // Required by API
  phoneNumber: string; // Required by API for creation
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags?: string[]; // Optional in API request
  knowledgeBaseId?: string | null; // Use ID for creation link
};

// Define the structure for updating an assistant (maps to PATCH body)
// Using Partial on relevant Assistant fields + knowledgeBaseId
type UpdateAssistantData = Partial<Omit<Assistant, 'id' | 'createdAt' | 'knowledgeBase'>> & {
  knowledgeBaseId?: string | null; // Use ID or null for updating link
};


interface AssistantsContextType {
  assistants: Assistant[];
  currentAssistant: Assistant | null;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  addDraftAssistant: (draftAssistantData: Omit<Assistant, 'id' | 'createdAt'>) => Assistant; // For adding drafts locally + localStorage
  createAssistant: (localId: string, assistantData: CreateAssistantData) => Promise<Assistant | undefined>; // Publishes a draft, needs localId to remove from storage
  updateAssistantLocally: (id: string, updatedData: Partial<Assistant>) => void; // Updates state + localStorage for drafts
  deleteAssistant: (id: string) => Promise<boolean>; // Handles both drafts (local) and published (API)
  fetchAssistants: () => Promise<void>; // Fetches API assistants, merges with local drafts
  saveAssistantUpdates: (id: string, updatedData: UpdateAssistantData) => Promise<Assistant | undefined>; // Saves published assistants
}

// Create context with default values
export const AssistantsContext = createContext<AssistantsContextType>({
  assistants: [],
  currentAssistant: null,
  setCurrentAssistant: () => { },
  addDraftAssistant: () => ({} as Assistant),
  createAssistant: async () => undefined,
  updateAssistantLocally: () => { },
  deleteAssistant: async () => false,
  fetchAssistants: async () => { },
  saveAssistantUpdates: async () => undefined,
});

const API_BASE_URL = 'http://localhost:7071/api';
const DRAFT_ASSISTANTS_STORAGE_KEY = 'draftAssistants';

// Helper to parse API errors
const getApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    return body.error || `Request failed with status ${res.status}`;
  } catch (e) {
    return `Request failed with status ${res.status}`;
  }
};

// Helper to load drafts from localStorage
const loadDrafts = (): Assistant[] => {
  if (typeof window === 'undefined') return []; // Guard for SSR
  try {
    const storedDrafts = localStorage.getItem(DRAFT_ASSISTANTS_STORAGE_KEY);
    if (storedDrafts) {
      const parsed = JSON.parse(storedDrafts);
      // Ensure dates are parsed correctly
      return parsed.map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) }));
    }
  } catch (error) {
    console.error("Error loading drafts from localStorage:", error);
  }
  return [];
};

// Helper to save drafts to localStorage
const saveDrafts = (drafts: Assistant[]) => {
  if (typeof window === 'undefined') return; // Guard for SSR
  try {
    localStorage.setItem(DRAFT_ASSISTANTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error("Error saving drafts to localStorage:", error);
  }
};

export const AssistantsProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  // Combined fetch and merge logic
  const fetchAssistants = async () => {
    let apiAssistants: Assistant[] = [];
    try {
      const res = await fetch(`${API_BASE_URL}/assistants`);
      if (!res.ok) {
        const errorText = await getApiError(res);
        console.error('Failed to fetch assistants:', errorText);
        toast({ title: 'Error Fetching Assistants', description: errorText });
        // Don't return, proceed to load drafts
      } else {
        const data = await res.json();
        console.log('[Assistants] GET /api/assistants Raw fetched:', data);
        apiAssistants = data.map((a: any) => ({
          ...a,
          createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
          knowledgeBase: a.knowledgeBase || null,
          tags: a.tags || [], // Ensure tags array exists
        }));
        console.log('[Assistants] Processed API list:', apiAssistants);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Could not load assistants.';
      console.error('Error fetching assistants:', err);
      toast({ title: 'Error Fetching Assistants', description: errorMsg });
      // Proceed to load drafts even if API fetch fails
    }

    // Load local drafts
    const localDrafts = loadDrafts();
    console.log('[Assistants] Loaded Local Drafts:', localDrafts);

    // Merge: Combine API assistants and local drafts
    // Filter out any drafts that might have been successfully published but not cleared from storage
    const apiAssistantIds = new Set(apiAssistants.map(a => a.id));
    const uniqueDrafts = localDrafts.filter(draft => !apiAssistantIds.has(draft.id));

    const combinedAssistants = [...apiAssistants, ...uniqueDrafts];
    // Sort maybe? By createdAt?
    combinedAssistants.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

    console.log('[Assistants] Combined and Sorted list:', combinedAssistants);
    setAssistants(combinedAssistants);
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchAssistants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adds a draft assistant to local state AND localStorage
  const addDraftAssistant = (draftAssistantData: Omit<Assistant, 'id' | 'createdAt'>): Assistant => {
    const localId = `local-${uuidv4()}`;
    const newDraft: Assistant = {
      ...draftAssistantData,
      id: localId,
      createdAt: new Date(),
      phoneNumber: draftAssistantData.phoneNumber || '', // Ensure defaults
      tags: draftAssistantData.tags || [], // Ensure defaults
      knowledgeBase: draftAssistantData.knowledgeBase || null,
    };

    console.log('[Assistants] Add Draft Locally:', newDraft);
    const updatedAssistants = [...assistants, newDraft];
    setAssistants(updatedAssistants);

    // Update localStorage with the new list of drafts
    const currentDrafts = updatedAssistants.filter(a => a.id.startsWith('local-'));
    saveDrafts(currentDrafts);

    return newDraft;
  };

  // UPDATED: Publishes a draft assistant to the backend
  const createAssistant = async (localId: string, assistantData: CreateAssistantData): Promise<Assistant | undefined> => {
    // Payload uses data passed in, which should be validated beforehand
    const { knowledgeBaseId, ...restData } = assistantData;
    const payload: any = { ...restData };
    if (knowledgeBaseId !== undefined) {
      payload.knowledgeBase = knowledgeBaseId;
    }

    console.log('[Assistants] POST /api/assistants (Publishing Draft) Payload:', payload);
    try {
      const res = await fetch(`${API_BASE_URL}/assistants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await getApiError(res);
        console.error('Failed to create/publish assistant:', res.status, errorText);
        toast({ title: 'Publish Error', description: errorText });
        return undefined; // Indicate failure
      }

      const createdAssistantResponse = await res.json();
      const processedAssistant: Assistant = {
        ...createdAssistantResponse,
        createdAt: createdAssistantResponse.createdAt ? new Date(createdAssistantResponse.createdAt) : new Date(),
        knowledgeBase: createdAssistantResponse.knowledgeBase || null,
        tags: createdAssistantResponse.tags || [],
      };

      console.log('[Assistants] POST Success, published:', processedAssistant);
      toast({ title: 'Success', description: `Assistant '${processedAssistant.name}' published.` });

      // Update state: Remove draft, add published version (or just refetch)
      // Let's refetch for simplicity and ensure consistency
      await fetchAssistants();

      // Remove the specific published draft from localStorage
      const currentDrafts = loadDrafts();
      const updatedDrafts = currentDrafts.filter(d => d.id !== localId);
      saveDrafts(updatedDrafts);

      return processedAssistant; // Return the published assistant data

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Error publishing assistant:', err);
      toast({ title: 'Publish Error', description: errorMsg });
      return undefined; // Indicate failure
    }
  };

  // Updates assistant state LOCALLY and updates localStorage if it's a draft
  const updateAssistantLocally = (id: string, updatedData: Partial<Assistant>) => {
    console.log('[Assistants] Update Locally:', id, updatedData);
    let updatedAssistants: Assistant[] | null = null;

    setAssistants((prev) => {
      updatedAssistants = prev.map((assistant) =>
        assistant.id === id ? { ...assistant, ...updatedData } : assistant
      );
      return updatedAssistants;
    });

    // Update currentAssistant if it's the one being edited
    if (currentAssistant?.id === id) {
      setCurrentAssistant((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

    // If it was a draft, update localStorage
    if (id.startsWith('local-') && updatedAssistants) {
      const currentDrafts = updatedAssistants.filter(a => a.id.startsWith('local-'));
      saveDrafts(currentDrafts);
      console.log('[Assistants] Updated draft in localStorage:', id);
    }
  };

  // Saves updates for an EXISTING PUBLISHED assistant to the backend
  const saveAssistantUpdates = async (id: string, updatedData: UpdateAssistantData): Promise<Assistant | undefined> => {
    if (id.startsWith('local-')) {
      console.error('Attempted to save updates for a draft assistant using saveAssistantUpdates. Use createAssistant (publish) instead.');
      toast({ title: 'Error', description: 'Cannot save changes for a draft. Publish it first.' });
      return undefined;
    }

    // Restore original logic: Destructure knowledgeBaseId from updatedData
    const { knowledgeBaseId, ...restData } = updatedData;
    const payload: any = { ...restData };
    // Send knowledgeBase in payload ONLY if knowledgeBaseId was present in updatedData
    if (knowledgeBaseId !== undefined) {
      payload.knowledgeBase = knowledgeBaseId;
    }

    if (Object.keys(payload).length === 0) {
      toast({ title: 'No Changes', description: 'No fields were modified to save.' });
      return undefined;
    }

    console.log('[Assistants] PATCH /api/assistants/:id', `${API_BASE_URL}/assistants/${id}`, 'Payload:', payload);
    try {
      const res = await fetch(`${API_BASE_URL}/assistants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await getApiError(res);
        console.error('Failed to save assistant updates:', res.status, errorText);
        toast({ title: 'Save Error', description: errorText });
        return undefined;
      }

      const updatedAssistantResponse = await res.json();
      const processedAssistant: Assistant = {
        ...updatedAssistantResponse,
        createdAt: updatedAssistantResponse.createdAt ? new Date(updatedAssistantResponse.createdAt) : new Date(),
        knowledgeBase: updatedAssistantResponse.knowledgeBase || null,
        tags: updatedAssistantResponse.tags || [],
      };

      console.log('[Assistants] PATCH Success, updated:', processedAssistant);
      toast({ title: 'Success', description: 'Assistant updates saved.' });

      // Update local state with confirmed data
      setAssistants((prev) =>
        prev.map((assistant) =>
          assistant.id === id ? processedAssistant : assistant
        )
      );
      if (currentAssistant?.id === id) {
        setCurrentAssistant(processedAssistant);
      }
      return processedAssistant;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Error saving assistant updates:', err);
      toast({ title: 'Save Error', description: errorMsg });
      return undefined;
    }
  };

  // UPDATED: Deletes either a local draft or a published assistant via API
  const deleteAssistant = async (id: string): Promise<boolean> => {
    // Handle draft deletion locally
    if (id.startsWith('local-')) {
      console.log('[Assistants] Deleting Draft Locally:', id);
      const updatedAssistants = assistants.filter((assistant) => assistant.id !== id);
      setAssistants(updatedAssistants);

      // Remove from localStorage
      const currentDrafts = updatedAssistants.filter(a => a.id.startsWith('local-'));
      saveDrafts(currentDrafts);

      toast({ title: 'Success', description: 'Draft discarded.' });
      if (currentAssistant?.id === id) {
        setCurrentAssistant(null); // Deselect if it was the current one
      }
      return true; // Indicate local success
    }

    // Handle published assistant deletion via API
    console.log('[Assistants] DELETE /api/assistants/:id', `${API_BASE_URL}/assistants/${id}`);
    try {
      const res = await fetch(`${API_BASE_URL}/assistants/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorText = await getApiError(res);
        console.error('Failed to delete assistant:', res.status, errorText);
        toast({ title: 'Delete Error', description: errorText });
        return false; // Indicate failure
      }

      console.log('[Assistants] DELETE Success for ID:', id);
      toast({ title: 'Success', description: 'Assistant deleted.' });

      // Remove from local state (or refetch)
      setAssistants((prev) => prev.filter((assistant) => assistant.id !== id));
      if (assistantsCacheRef.data) {
        assistantsCacheRef.data = assistantsCacheRef.data.filter((assistant: Assistant) => assistant.id !== id);
        assistantsCacheRef.timestamp = Date.now();
      }
      if (currentAssistant?.id === id) {
        setCurrentAssistant(null);
      }
      return true; // Indicate success

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Error deleting assistant:', err);
      toast({ title: 'Delete Error', description: errorMsg });
      return false; // Indicate failure
    }
  };

  return (
    <AssistantsContext.Provider
      value={{
        assistants,
        currentAssistant,
        setCurrentAssistant,
        addDraftAssistant,
        createAssistant, // Now handles publishing drafts
        updateAssistantLocally, // Handles local state + draft storage
        deleteAssistant, // Handles both drafts and published
        fetchAssistants, // Merges API + local drafts
        saveAssistantUpdates, // Only for published assistants
      }}
    >
      {children}
    </AssistantsContext.Provider>
  );
};

// Custom hook for using the context
export const useAssistants = () => useContext(AssistantsContext);

// Ensure eslint ignores the dependency array warning for the initial fetch useEffect
// if it flags it. The fetch should typically only run once on mount.
// You might need a // eslint-disable-next-line react-hooks/exhaustive-deps above the array.
// Added it above.
