'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useToast } from '@/app/knowledge-base/hooks/use-toast';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

// Define the Assistant type - Matches API GET response structure & Prisma Schema
export interface Assistant {
  id: string; // Can be 'local-...' for drafts or UUID for published
  user_uid: string; // Required - links assistant to user
  contact_bucket_id: string | null; // Associated contact bucket
  name: string;
  phoneNumber: string; // Non-optional in DB, but might be empty in draft state initially
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  callProvider?: string; // 'twilio' | 'vobiz' - which trunk to use for outbound calls
  costPerMin?: number;
  latencyMs?: number;
  tags: string[]; // Non-optional (defaults to [])
  createdAt: Date; // Represents local creation time for drafts, API time for published
  knowledgeBase?: string | null; // Stores the URL from GET, or null
  // Email and workflow fields from new API
  emailSubject?: string;
  emailBody?: string;
  from?: string;
  attachments?: string[];
  personalisation?: boolean;
  flowJson?: Record<string, unknown> | null;
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

// Use new Monade Voice Config Server API
const API_BASE_URL = MONADE_API_CONFIG.BASE_URL;
const DRAFT_ASSISTANTS_STORAGE_KEY = 'draftAssistants';

// Helper to get organization-scoped storage key
const getStorageKey = (organizationId?: string): string => {
  return organizationId ? `${DRAFT_ASSISTANTS_STORAGE_KEY}_${organizationId}` : DRAFT_ASSISTANTS_STORAGE_KEY;
};

// Helper to get organization context headers
const getOrgHeaders = (organizationId?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (organizationId) {
    headers['X-Organization-ID'] = organizationId;
  }

  return headers;
};

// Helper to parse API errors
const getApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();

    return body.error || `Request failed with status ${res.status}`;
  } catch (e) {
    return `Request failed with status ${res.status}`;
  }
};

// Helper to load drafts from localStorage with organization context
const loadDrafts = (organizationId?: string): Assistant[] => {
  if (typeof window === 'undefined') return []; // Guard for SSR
  try {
    const storageKey = getStorageKey(organizationId);
    const storedDrafts = localStorage.getItem(storageKey);
    if (storedDrafts) {
      const parsed = JSON.parse(storedDrafts);

      // Ensure dates are parsed correctly
      return parsed.map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) }));
    }
  } catch (error) {
    console.error('Error loading drafts from localStorage:', error);
  }

  return [];
};

// Helper to save drafts to localStorage with organization context
const saveDrafts = (drafts: Assistant[], organizationId?: string) => {
  if (typeof window === 'undefined') return; // Guard for SSR
  try {
    const storageKey = getStorageKey(organizationId);
    localStorage.setItem(storageKey, JSON.stringify(drafts));
  } catch (error) {
    console.error('Error saving drafts to localStorage:', error);
  }
};

let assistantsCache: Assistant[] | null = null;

// Import useMonadeUser hook
import { useMonadeUser } from './use-monade-user';

export const AssistantsProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  // Use dynamic user_uid from Monade User context
  const { userUid, loading: authLoading } = useMonadeUser();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  // Combined fetch and merge logic with in-memory cache
  const fetchAssistants = useCallback(async () => {
    console.log('[Assistants] Starting fetchAssistants. User UID:', userUid, 'Auth loading:', authLoading);

    if (!userUid) {
      console.log('[Assistants] No user_uid available, skipping fetch');
      return;
    }

    // Check in-memory cache first
    if (assistantsCache && assistantsCache.length > 0) {
      setAssistants(assistantsCache);
      console.log('[Assistants] Loaded from in-memory cache:', assistantsCache);

      return;
    }

    let apiAssistants: Assistant[] = [];
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_CONFIG.API_KEY
      };
      console.log('[Assistants] Making API request with headers:', headers);
      // Use user-specific endpoint for the new API
      console.log('[Assistants] API URL:', `${API_BASE_URL}/api/assistants/user/${userUid}`);

      const res = await fetch(`${API_BASE_URL}/api/assistants/user/${userUid}`, { headers });
      console.log('[Assistants] API response status:', res.status, 'OK:', res.ok);

      if (!res.ok) {
        const errorText = await getApiError(res);
        console.error('[Assistants] API request failed. Status:', res.status, 'Error:', errorText);
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
      console.error('[Assistants] Fetch error caught:', err);
      console.error('[Assistants] Error details:', {
        message: errorMsg,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        userUid,
        apiUrl: `${API_BASE_URL}/api/assistants/user/${userUid}`,
      });
      toast({ title: 'Error Fetching Assistants', description: errorMsg });
      // Proceed to load drafts even if API fetch fails
    }

    // Load local drafts with user context
    const localDrafts = loadDrafts(userUid);
    console.log('[Assistants] Loaded Local Drafts:', localDrafts);

    // Merge: Combine API assistants and local drafts
    // Filter out any drafts that might have been successfully published but not cleared from storage
    const apiAssistantIds = new Set(apiAssistants.map(a => a.id));
    const uniqueDrafts = localDrafts.filter(draft => !apiAssistantIds.has(draft.id));

    const combinedAssistants = [...apiAssistants, ...uniqueDrafts];
    // Sort maybe? By createdAt?
    combinedAssistants.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

    // Populate in-memory cache
    assistantsCache = combinedAssistants;

    console.log('[Assistants] Combined and Sorted list:', combinedAssistants);
    setAssistants(combinedAssistants);
  }, [userUid, toast]); // Dependencies for useCallback

  // Initial fetch on mount and when organization changes
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('[Assistants] Skipping fetch - auth still loading');

      return;
    }

    console.log('[Assistants] Auth loaded, proceeding with fetch. User UID:', userUid);
    // Clear cache when user changes
    assistantsCache = null;
    fetchAssistants();
  }, [userUid, fetchAssistants, authLoading]); // Depend on user UID, fetchAssistants, and authLoading

  // Adds a draft assistant to local state AND localStorage
  const addDraftAssistant = (draftAssistantData: Omit<Assistant, 'id' | 'createdAt'>): Assistant => {
    // userUid already available from useMonadeUser hook
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

    // Update localStorage with the new list of drafts (user-scoped)
    const currentDrafts = updatedAssistants.filter(a => a.id.startsWith('local-'));
    saveDrafts(currentDrafts, userUid);

    return newDraft;
  };

  // UPDATED: Publishes a draft assistant to the backend
  const createAssistant = async (localId: string, assistantData: CreateAssistantData): Promise<Assistant | undefined> => {
    // userUid already available from useMonadeUser hook

    // Payload uses data passed in, which should be validated beforehand
    const { knowledgeBaseId, ...restData } = assistantData;
    const payload: any = { ...restData };
    if (knowledgeBaseId !== undefined) {
      payload.knowledgeBase = knowledgeBaseId;
    }

    console.log('[Assistants] POST /api/assistants (Publishing Draft) Payload:', payload);
    try {
      // Include user_uid in the payload for the new API
      payload.user_uid = userUid;
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_CONFIG.API_KEY
      };
      const res = await fetch(`${API_BASE_URL}/api/assistants`, {
        method: 'POST',
        headers,
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
      const currentDrafts = loadDrafts(userUid);
      const updatedDrafts = currentDrafts.filter(d => d.id !== localId);
      saveDrafts(updatedDrafts, userUid);

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
    // userUid already available from useMonadeUser hook
    console.log('[Assistants] Update Locally:', id, updatedData);
    let updatedAssistants: Assistant[] | null = null;

    setAssistants((prev) => {
      updatedAssistants = prev.map((assistant) =>
        assistant.id === id ? { ...assistant, ...updatedData } : assistant,
      );

      return updatedAssistants;
    });

    // Update currentAssistant if it's the one being edited
    if (currentAssistant?.id === id) {
      setCurrentAssistant((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

    // If it was a draft, update localStorage with user context
    if (id.startsWith('local-') && updatedAssistants) {
      const currentDrafts = updatedAssistants.filter(a => a.id.startsWith('local-'));
      saveDrafts(currentDrafts, userUid);
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

    console.log('[Assistants] PATCH /api/assistants/:id', `${API_BASE_URL}/api/assistants/${id}`, 'Payload:', payload);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_CONFIG.API_KEY
      };
      const res = await fetch(`${API_BASE_URL}/api/assistants/${id}`, {
        method: 'PATCH',
        headers,
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
          assistant.id === id ? processedAssistant : assistant,
        ),
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
    // userUid already available from useMonadeUser hook

    // Handle draft deletion locally
    if (id.startsWith('local-')) {
      console.log('[Assistants] Deleting Draft Locally:', id);
      const updatedAssistants = assistants.filter((assistant) => assistant.id !== id);
      setAssistants(updatedAssistants);

      // Remove from localStorage with user context
      const currentDrafts = updatedAssistants.filter(a => a.id.startsWith('local-'));
      saveDrafts(currentDrafts, userUid);

      toast({ title: 'Success', description: 'Draft discarded.' });
      if (currentAssistant?.id === id) {
        setCurrentAssistant(null); // Deselect if it was the current one
      }

      return true; // Indicate local success
    }

    // Handle published assistant deletion via API
    console.log('[Assistants] DELETE /api/assistants/:id', `${API_BASE_URL}/api/assistants/${id}`);
    try {
      // Note: Don't set Content-Type for DELETE without body, it causes backend errors
      const headers: Record<string, string> = {
        'X-API-Key': MONADE_API_CONFIG.API_KEY
      };
      const res = await fetch(`${API_BASE_URL}/api/assistants/${id}`, {
        method: 'DELETE',
        headers,
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
