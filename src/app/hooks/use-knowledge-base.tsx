'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/app/knowledge-base/hooks/use-toast'; // Assuming toast is needed

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

// Define API base URL (can be moved to a config file later)
const API_BASE_URL = process.env.NEXT_PUBLIC_ASSISTANTS_BASEURL || 'http://localhost:7071/api';

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
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); // State for error

    // Fetch Knowledge Bases
    const fetchKnowledgeBases = useCallback(async () => {
        setIsLoading(true);
        setError(null); // Reset error on fetch
        try {
            const res = await fetch(`${API_BASE_URL}/knowledge-bases`);
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
            toast({ title: 'Creation Failed', description: 'No content provided (text or file).', });
            return false;
        }
        setIsLoading(true); // Indicate loading during creation
        setError(null); // Reset error
        try {
            console.log('[createKnowledgeBase] Attempting to create KB with payload:', payload);
            const res = await fetch(`${API_BASE_URL}/knowledge-bases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorText = await getApiError(res);
                throw new Error(errorText);
            }

            const newKb = await res.json();
            toast({ title: 'Knowledge Base Created', description: `Successfully added ${payload.filename || 'new document'}. ID: ${newKb.kb_id}` });
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
            const res = await fetch(`${API_BASE_URL}/knowledge-bases/${id}`, {
                method: 'DELETE',
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
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]); // Use fetchKnowledgeBases from useCallback

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