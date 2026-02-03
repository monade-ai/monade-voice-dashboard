'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { MONADE_API_CONFIG } from '@/types/monade-api.types';

import { useMonadeUser } from './use-monade-user';

export interface LibraryItem {
  id: string;
  filename: string;
  url: string;
  createdAt: Date;
  connectedAssistantIds?: string[];
}

interface CreatePayload {
  kb_text?: string;
  kb_file_base64?: string;
  filename: string;
}

interface LibraryContextType {
  items: LibraryItem[];
  groupedItems: Record<string, LibraryItem[]>;
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
        headers: { 'X-API-Key': MONADE_API_CONFIG.API_KEY },
      });
      
      if (!res.ok) throw new Error('Failed to synchronize library');
      
      const data = await res.json();
      const processed = data.map((kb: any) => ({
        ...kb,
        createdAt: new Date(kb.createdAt || Date.now()),
        connectedAssistantIds: [], 
      })).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setItems(processed);
    } catch {
      setError('Could not reach the library archive.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userUid, authLoading]);

  // Helper to group items by month/year for the timeline
  const groupedItems = useMemo(() => {
    const groups: Record<string, LibraryItem[]> = {};
    items.forEach(item => {
      const date = new Date(item.createdAt);
      const key = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return groups;
  }, [items]);

  const addIntelligence = async (payload: CreatePayload): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': MONADE_API_CONFIG.API_KEY, 
        },
        body: JSON.stringify({ ...payload, user_uid: userUid }),
      });

      if (!res.ok) throw new Error('Failed to save intelligence');

      toast.success('Library Updated', { description: `${payload.filename} is now part of the memory.` });
      await fetchItems();

      return true;
    } catch {
      toast.error('Sync Failed');

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
        headers: { 'X-API-Key': MONADE_API_CONFIG.API_KEY },
      });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success('Item Removed');
      await fetchItems();

      return true;
    } catch {
      toast.error('Purge Failed');

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchItems();
  }, [fetchItems, authLoading]);

  return (
    <LibraryContext.Provider value={{ items, groupedItems, isLoading, error, refresh: fetchItems, addIntelligence, removeIntelligence }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within a LibraryProvider');

  return context;
};

// Backward Compatibility
export const KnowledgeBaseProvider = LibraryProvider;
export const useKnowledgeBase = useLibrary;
export type KnowledgeBase = LibraryItem;
