'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

import { useToast } from '@/app/knowledge-base/hooks/use-toast';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

// Define Knowledge Base type (matches API response)
export interface KnowledgeBase {
  id: string;
  filename: string;
  url: string;
  createdAt: Date;
}

// Define the structure for creating a KB
interface CreateKnowledgeBasePayload {
  kb_text?: string;
  kb_file_base64?: string;
  filename?: string;
}

interface KnowledgeBaseContextType {
  knowledgeBases: KnowledgeBase[];
  isLoading: boolean;
  error: string | null; // Add error state to type
  fetchKnowledgeBases: () => Promise<void>;
  createKnowledgeBase: (payload: CreateKnowledgeBasePayload) => Promise<boolean>; // Returns true on success
  deleteKnowledgeBase: (id: string) => Promise<boolean>; // Returns true on success
}

// Create context with default values
export const KnowledgeBaseContext = createContext<KnowledgeBaseContextType>({
  knowledgeBases: [],
  isLoading: true,
  error: null, // Add error to default value
  fetchKnowledgeBases: async () => { },
  createKnowledgeBase: async () => false,
  deleteKnowledgeBase: async () => false,
});

// Define API base URL (new Monade Voice Config Server API)
const API_BASE_URL = MONADE_API_CONFIG.BASE_URL;
const DEFAULT_USER_UID = MONADE_API_CONFIG.DEFAULT_USER_UID;

// Helper to parse API errors (can be shared or duplicated)
const getApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();

    return body.error || `Request failed with status ${res.status}`;
  } catch (e) {
    return `Request failed with status ${res.status}`;
  }
};

// Knowledge Base Provider Component
export const KnowledgeBaseProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  // Use user_uid from Monade API config
  const currentUserUid = DEFAULT_USER_UID;
  const authLoading = false; // Placeholder
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // State for error

  // Fetch Knowledge Bases
  const fetchKnowledgeBases = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Reset error on fetch
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_CONFIG.API_KEY,
      };

      // Use user-specific endpoint for new API
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUserUid}/knowledge-bases`, { headers });
      if (!res.ok) {
        const errorText = await getApiError(res);
        throw new Error(errorText); // Throw error to be caught below
      }
      const data = await res.json();
      const processedKBs = data.map((kb: any) => ({
        ...kb,
        createdAt: kb.createdAt ? new Date(kb.createdAt) : new Date(), // Keep Date object
      }));
      // Sort by date, newest first
      processedKBs.sort((a: KnowledgeBase, b: KnowledgeBase) => b.createdAt.getTime() - a.createdAt.getTime());
      setKnowledgeBases(processedKBs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Could not load knowledge bases.';
      console.error('Error fetching knowledge bases:', err);
      toast({ title: 'Error Fetching KBs', description: errorMsg });
      setError(errorMsg); // Set error state
      setKnowledgeBases([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Add toast as dependency

  // Create Knowledge Base
  const createKnowledgeBase = async (payload: CreateKnowledgeBasePayload): Promise<boolean> => {
    if (!payload.kb_text && !payload.kb_file_base64) {
      toast({ title: 'Creation Failed', description: 'No content provided (text or file).' });

      return false;
    }
    setIsLoading(true); // Indicate loading during creation
    setError(null); // Reset error
    try {
      console.log('[createKnowledgeBase] Attempting to create KB with payload:', payload);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_CONFIG.API_KEY,
      };

      // Include user_uid in the payload for new API
      const apiPayload = {
        ...payload,
        user_uid: currentUserUid,
      };

      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: 'POST',
        headers,
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        const errorText = await getApiError(res);
        throw new Error(errorText);
      }

      const newKb = await res.json();
      toast({ title: 'Knowledge Base Created', description: `Successfully added ${payload.filename || 'new document'}.` });
      await fetchKnowledgeBases(); // Refresh list

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Could not create knowledge base.';
      console.error('[createKnowledgeBase] Error caught:', err); // More specific logging
      toast({ title: 'Creation Failed', description: errorMsg });
      setError(errorMsg); // Set error state
      setIsLoading(false); // Stop loading on error

      return false;
    }
    // No finally isLoading=false here, as fetchKnowledgeBases will handle it
  };

  // Delete Knowledge Base
  const deleteKnowledgeBase = async (id: string): Promise<boolean> => {
    setIsLoading(true); // Indicate loading during deletion
    setError(null); // Reset error
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_CONFIG.API_KEY,
      };

      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorText = await getApiError(res);
        throw new Error(errorText);
      }

      await res.json(); // Consume response body
      toast({ title: 'Knowledge Base Deleted', description: `Successfully deleted KB ${id}.` });
      await fetchKnowledgeBases(); // Refresh list to confirm deletion

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Could not delete knowledge base.';
      console.error('Error deleting knowledge base:', err);
      toast({ title: 'Deletion Failed', description: errorMsg });
      setError(errorMsg); // Set error state
      setIsLoading(false); // Stop loading on error

      return false;
    }
    // No finally isLoading=false here, as fetchKnowledgeBases will handle it
  };

  // Initial fetch on mount
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('[KnowledgeBase] Skipping fetch - auth still loading');

      return;
    }

    console.log('[KnowledgeBase] Auth loaded, proceeding with fetch. User UID:', currentUserUid);
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases, authLoading]); // Use fetchKnowledgeBases from useCallback and authLoading

  return (
    <KnowledgeBaseContext.Provider
      value={{
        knowledgeBases,
        isLoading, // Provide loading state
        error, // Provide error state
        fetchKnowledgeBases,
        createKnowledgeBase,
        deleteKnowledgeBase,
      }}
    >
      {children}
    </KnowledgeBaseContext.Provider>
  );
};

// Custom hook for using the context
export const useKnowledgeBase = () => useContext(KnowledgeBaseContext);
