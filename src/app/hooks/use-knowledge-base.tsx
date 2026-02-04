'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';
import { useMonadeUser } from './use-monade-user';
import { toast } from 'sonner';

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
  contentCache: Record<string, string>; // URL -> Content
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fetchSnippet: (url: string) => Promise<string>;
  addIntelligence: (payload: CreatePayload) => Promise<boolean>;
  removeIntelligence: (id: string) => Promise<boolean>;
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const API_BASE_URL = MONADE_API_CONFIG.BASE_URL;

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const { userUid, loading: authLoading } = useMonadeUser();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
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
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      const processed = data.map((kb: any) => ({
        ...kb,
        createdAt: new Date(kb.createdAt || Date.now()),
      })).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
      setItems(processed);
    } catch (err) {
      setError('Archive unreachable.');
    } finally {
      setIsLoading(false);
    }
  }, [userUid, authLoading]);

  const fetchSnippet = useCallback(async (url: string) => {
    if (contentCache[url]) return contentCache[url];
    
    try {
        const res = await fetch('/api/transcript-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        const snippet = data.transcript || data.raw || "No content found.";
        const trimmed = snippet.substring(0, 500); // Fetch first 500 chars
        setContentCache(prev => ({ ...prev, [url]: trimmed }));
        return trimmed;
    } catch (err) {
        return "Failed to load preview.";
    }
  }, [contentCache]);

  const addIntelligence = async (payload: CreatePayload): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': MONADE_API_CONFIG.API_KEY },
        body: JSON.stringify({ ...payload, user_uid: userUid }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Library Updated');
      await fetchItems();
      return true;
    } catch (err) {
      toast.error('Sync Error');
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
      toast.success('Purged from memory');
      await fetchItems();
      return true;
    } catch (err) {
      toast.error('Purge Error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchItems();
  }, [fetchItems, authLoading]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, LibraryItem[]> = {};
    items.forEach(item => {
      const key = new Date(item.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [items]);

  return (
    <LibraryContext.Provider value={{ items, groupedItems, contentCache, isLoading, error, refresh: fetchItems, fetchSnippet, addIntelligence, removeIntelligence }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary error');
  return context;
};

export const KnowledgeBaseProvider = LibraryProvider;
export const useKnowledgeBase = useLibrary;
export type KnowledgeBase = LibraryItem;