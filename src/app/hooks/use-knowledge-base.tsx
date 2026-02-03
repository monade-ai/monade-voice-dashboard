'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';
import { useMonadeUser } from './use-monade-user';
import { toast } from 'sonner'; // Using sonner for high-end toasts

export interface LibraryItem {
  id: string;
  filename: string;
  url: string;
  createdAt: Date;
  // Metadata for interlinking
  connectedAssistantIds?: string[];
}

interface CreatePayload {
  kb_text?: string;
  kb_file_base64?: string;
  filename: string;
}

interface LibraryContextType {
  items: LibraryItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addIntelligence: (payload: CreatePayload) => Promise<boolean>;
  removeIntelligence: (id: string) => Promise<boolean>;
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const API_BASE_URL = MONADE_API_CONFIG.BASE_URL;

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const { userUid, loading: authLoading } = useMonadeUser();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userUid) {
      if (!authLoading) setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userUid}/knowledge-bases`, {
        headers: { 'X-API-Key': MONADE_API_CONFIG.API_KEY }
      });
      
      if (!res.ok) throw new Error('Failed to synchronize library');
      
      const data = await res.json();
      const processed = data.map((kb: any) => ({
        ...kb,
        createdAt: new Date(kb.createdAt || Date.now()),
        connectedAssistantIds: [] // TODO: Map this from Assistant API in the UI layer
      })).sort((a: any, b: any) => b.createdAt - a.createdAt);
      
      setItems(processed);
    } catch (err) {
      setError('Could not reach the library archive.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userUid, authLoading]);

  const addIntelligence = async (payload: CreatePayload): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': MONADE_API_CONFIG.API_KEY 
        },
        body: JSON.stringify({ ...payload, user_uid: userUid }),
      });

      if (!res.ok) throw new Error('Failed to save intelligence');

      toast.success('Library Updated', { description: `${payload.filename} is now part of the collective memory.` });
      await fetchItems();
      return true;
    } catch (err) {
      toast.error('Sync Failed', { description: 'We could not save this information to the cloud.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeIntelligence = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': MONADE_API_CONFIG.API_KEY }
      });

      if (!res.ok) throw new Error('Deletion failed');

      toast.success('Item Removed', { description: 'Information has been purged from the archive.' });
      await fetchItems();
      return true;
    } catch (err) {
      toast.error('Purge Failed', { description: 'Could not remove item from cloud storage.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchItems();
  }, [fetchItems, authLoading]);

    return (

      <LibraryContext.Provider value={{ items, isLoading, error, refresh: fetchItems, addIntelligence, removeIntelligence }}>

        {children}

      </LibraryContext.Provider>

    );

  };

  

  // --- New Naming (The Library) ---

  export const useLibrary = () => {

    const context = useContext(LibraryContext);

    if (!context) throw new Error('useLibrary must be used within a LibraryProvider');

    return context;

  };

  

  // --- Backward Compatibility (The Archive) ---

  export const KnowledgeBaseProvider = LibraryProvider;

  export const useKnowledgeBase = useLibrary;

  export type KnowledgeBase = LibraryItem;

  