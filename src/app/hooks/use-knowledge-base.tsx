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
  category?: LibraryCategory;
  displayName?: string;
}

export type LibraryCategory = 'knowledge' | 'initial_greeting' | 'initial_greeting_system_prompt';

interface CreatePayload {
  kb_text?: string;
  kb_file_base64?: string;
  filename: string;
  category?: LibraryCategory;
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
const LIBRARY_CACHE_TTL_MS = 60_000;
const LIBRARY_CATEGORY_PREFIXES: Record<Exclude<LibraryCategory, 'knowledge'>, string> = {
  initial_greeting: '__initial_greeting__',
  initial_greeting_system_prompt: '__initial_greeting_system_prompt__',
};

export const LIBRARY_CATEGORY_META: Record<LibraryCategory, { label: string; pluralLabel: string; description: string }> = {
  knowledge: {
    label: 'Knowledge Base',
    pluralLabel: 'Knowledge Bases',
    description: 'Full prompts and factual context for normal assistant behavior.',
  },
  initial_greeting: {
    label: 'Initial Greeting',
    pluralLabel: 'Initial Greetings',
    description: 'First spoken line after the call connects.',
  },
  initial_greeting_system_prompt: {
    label: 'Greeting System Prompt',
    pluralLabel: 'Greeting System Prompts',
    description: 'First-turn instruction wrapper for speaking the initial greeting.',
  },
};

export function getLibraryItemCategory(filename: string): LibraryCategory {
  if (filename.startsWith(LIBRARY_CATEGORY_PREFIXES.initial_greeting_system_prompt)) {
    return 'initial_greeting_system_prompt';
  }
  if (filename.startsWith(LIBRARY_CATEGORY_PREFIXES.initial_greeting)) {
    return 'initial_greeting';
  }

  return 'knowledge';
}

export function getLibraryDisplayName(filename: string): string {
  const category = getLibraryItemCategory(filename);
  if (category === 'knowledge') return filename;

  return filename.replace(LIBRARY_CATEGORY_PREFIXES[category], '');
}

function buildLibraryFilename(filename: string, category: LibraryCategory = 'knowledge') {
  if (category === 'knowledge') return filename;
  const prefix = LIBRARY_CATEGORY_PREFIXES[category];

  return filename.startsWith(prefix) ? filename : `${prefix}${filename}`;
}

interface LibraryCacheEntry {
  items: LibraryItem[];
  contentCache: Record<string, string>;
  cachedAt: number;
}

const libraryCacheByUser = new Map<string, LibraryCacheEntry>();

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const { userUid, loading: authLoading } = useMonadeUser();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const updateUserCache = useCallback((updater: (current: LibraryCacheEntry) => LibraryCacheEntry) => {
    if (!userUid) return;
    const current = libraryCacheByUser.get(userUid) ?? { items: [], contentCache: {}, cachedAt: 0 };
    libraryCacheByUser.set(userUid, updater(current));
  }, [userUid]);

  const fetchItems = useCallback(async (forceRefresh = false) => {
    if (!userUid) {
      if (!authLoading) setError('User not authenticated');
      setIsLoading(false);

      return;
    }

    if (!forceRefresh) {
      const cached = libraryCacheByUser.get(userUid);
      if (cached && Date.now() - cached.cachedAt < LIBRARY_CACHE_TTL_MS) {
        setItems(cached.items);
        setContentCache(cached.contentCache);
        setError(null);
        setIsLoading(false);

        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userUid}/knowledge-bases`, {
        // Direct call to backend (HTTPS)
        headers: {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      const processed = data.map((kb: any) => {
        const category = getLibraryItemCategory(kb.filename || '');

        return {
          ...kb,
          category,
          displayName: getLibraryDisplayName(kb.filename || ''),
          createdAt: new Date(kb.createdAt || Date.now()),
        };
      }).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
      setItems(processed);
      setError(null);
      updateUserCache((current) => ({
        ...current,
        items: processed,
        cachedAt: Date.now(),
      }));
    } catch (err) {
      setError('Archive unreachable.');
    } finally {
      setIsLoading(false);
    }
  }, [userUid, authLoading, updateUserCache]);

  const fetchSnippet = useCallback(async (url: string) => {
    if (contentCache[url]) return contentCache[url];
    const cachedSnippet = userUid ? libraryCacheByUser.get(userUid)?.contentCache[url] : undefined;
    if (cachedSnippet) {
      setContentCache((prev) => (prev[url] ? prev : { ...prev, [url]: cachedSnippet }));

      return cachedSnippet;
    }

    try {
      const res = await fetch('/api/transcript-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      const snippet = data.transcript || data.raw || 'No content found.';
      const trimmed = snippet.substring(0, 500); // Fetch first 500 chars
      setContentCache((prev) => ({ ...prev, [url]: trimmed }));
      updateUserCache((current) => ({
        ...current,
        contentCache: { ...current.contentCache, [url]: trimmed },
      }));

      return trimmed;
    } catch (err) {
      return 'Failed to load preview.';
    }
  }, [contentCache, userUid, updateUserCache]);

  const addIntelligence = async (payload: CreatePayload): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          filename: buildLibraryFilename(payload.filename, payload.category),
          user_uid: userUid,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Library Updated');
      await fetchItems(true);

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
        headers: {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success('Purged from memory');
      await fetchItems(true);

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
    <LibraryContext.Provider value={{ items, groupedItems, contentCache, isLoading, error, refresh: () => fetchItems(true), fetchSnippet, addIntelligence, removeIntelligence }}>
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
