import { useState, useEffect, useCallback } from 'react';
import {
  getContactLists,
  createContactList as apiCreateContactList,
  getListContacts,
  createContact,
  bulkCreateContacts,
  updateContactList as apiUpdateContactList,
  deleteContactList as apiDeleteContactList,
  getContact,
  updateContact,
  deleteContact,
  removeContactFromList,
  searchContactsApi,
} from '@/app/contacts/utils/contacts-api';
import { useAuth } from '@/lib/auth/AuthProvider';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  [key: string]: any;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  count: number;
  createdAt: Date;
}

interface UseContactsProps {
  initialLists?: ContactList[];
  initialContacts?: Record<string, Contact[]>;
}

interface UseContactsReturn {
  contactLists: ContactList[];
  contacts: Record<string, Contact[]>;
  selectedList: ContactList | null;
  isLoading: boolean;
  searchResults: Contact[];
  searchQuery: string;

  // Actions
  createContactList: (name: string, description?: string) => Promise<ContactList | null>;
  selectContactList: (listId: string | null) => void;
  addContactToList: (listId: string, contact: Omit<Contact, 'id'>) => Promise<Contact | null>;
  addContactsToList: (listId: string, contacts: Omit<Contact, 'id'>[]) => Promise<Contact[]>;
  removeContactFromList: (listId: string, contactId: string) => Promise<void>;
  removeContactList: (listId: string) => Promise<void>;
  searchInCurrentList: (query: string) => Promise<void>;
  clearSearch: () => void;
}

/**
 * API-driven hook to manage contacts and contact lists
 */
export function useContacts({ 
  initialLists = [], 
  initialContacts = {}, 
}: UseContactsProps = {}): UseContactsReturn {
  const { user, loading } = useAuth();
  const [contactLists, setContactLists] = useState<ContactList[]>(initialLists);
  const [contacts, setContacts] = useState<Record<string, Contact[]>>(initialContacts);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load all contact lists and their contacts on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let token: string | null = null;
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('access_token');
        }
        if (!token) throw new Error('Not authenticated');
        const listsRes = await getContactLists(token);
        const lists: ContactList[] = (listsRes.lists || []).map((l: any) => ({
          id: l.id,
          name: l.name,
          description: l.description,
          count: l.contact_count,
          createdAt: new Date(l.created_at),
        }));
        setContactLists(lists);

        // Fetch contacts for each list
        const contactsObj: Record<string, Contact[]> = {};
        for (const list of lists) {
          const contactsRes = await getListContacts(token, list.id);
          contactsObj[list.id] = (contactsRes || []).map((c: any) => ({
            ...c,
            createdAt: c.created_at ? new Date(c.created_at) : undefined,
            updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
          }));
        }
        setContacts(contactsObj);
      } catch (err) {
        // Optionally handle error
        setContactLists([]);
        setContacts({});
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Create a new contact list
  const createContactList = useCallback(async (name: string, description?: string): Promise<ContactList | null> => {
    setIsLoading(true);
    try {
      console.log('[createContactList] called with:', { name, description });
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
      }
      if (!token) throw new Error('Not authenticated');
      const res = await apiCreateContactList(token, name, description);
      console.log('[createContactList] API response:', res);
      const newList: ContactList = {
        id: res.id,
        name: res.name,
        description: res.description,
        count: res.contact_count || 0,
        createdAt: new Date(res.created_at),
      };
      setContactLists(prev => [...prev, newList]);
      setContacts(prev => ({ ...prev, [newList.id]: [] }));
      return newList;
    } catch (err) {
      console.error('[createContactList] error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Select a contact list
  const selectContactList = useCallback((listId: string | null) => {
    if (!listId) {
      setSelectedList(null);
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    const list = contactLists.find(list => list.id === listId);
    if (list) {
      setSelectedList(list);
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [contactLists]);

  // Add a single contact to a list
  const addContactToList = useCallback(async (listId: string, contact: Omit<Contact, 'id'>): Promise<Contact | null> => {
    setIsLoading(true);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
      }
      if (!token) throw new Error('Not authenticated');
      const res = await createContact(token, listId, contact);
      const newContact: Contact = {
        ...res,
        createdAt: res.created_at ? new Date(res.created_at) : undefined,
        updatedAt: res.updated_at ? new Date(res.updated_at) : undefined,
      };
      setContacts(prev => ({
        ...prev,
        [listId]: [...(prev[listId] || []), newContact],
      }));
      setContactLists(prev =>
        prev.map(list =>
          list.id === listId ? { ...list, count: list.count + 1 } : list,
        ),
      );
      return newContact;
    } catch (err) {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add multiple contacts to a list (bulk import)
  const addContactsToList = useCallback(async (listId: string, newContacts: Omit<Contact, 'id'>[]): Promise<Contact[]> => {
    setIsLoading(true);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
      }
      if (!token) throw new Error('Not authenticated');
      await bulkCreateContacts(token, listId, newContacts);
      // Re-fetch contacts for the list
      const contactsRes = await getListContacts(token, listId);
      const updatedContacts: Contact[] = (contactsRes || []).map((c: any) => ({
        ...c,
        createdAt: c.created_at ? new Date(c.created_at) : undefined,
        updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
      }));
      setContacts(prev => ({
        ...prev,
        [listId]: updatedContacts,
      }));
      setContactLists(prev =>
        prev.map(list =>
          list.id === listId ? { ...list, count: updatedContacts.length } : list,
        ),
      );
      return updatedContacts;
    } catch (err) {
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove a contact from a list
  const removeContactFromListFn = useCallback(async (listId: string, contactId: string) => {
    setIsLoading(true);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
      }
      if (!token) throw new Error('Not authenticated');
      await removeContactFromList(token, listId, contactId);
      setContacts(prev => {
        const listContacts = prev[listId] || [];
        const updatedContacts = listContacts.filter(contact => contact.id !== contactId);
        return {
          ...prev,
          [listId]: updatedContacts,
        };
      });
      setContactLists(prev =>
        prev.map(list =>
          list.id === listId ? { ...list, count: Math.max(0, list.count - 1) } : list,
        ),
      );
      if (searchQuery) {
        setSearchResults(prev => prev.filter(contact => contact.id !== contactId));
      }
    } catch (err) {
      // Optionally handle error
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Remove a contact list
  const removeContactListFn = useCallback(async (listId: string) => {
    setIsLoading(true);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
      }
      if (!token) throw new Error('Not authenticated');
      await apiDeleteContactList(token, listId);
      setContactLists(prev => prev.filter(list => list.id !== listId));
      setContacts(prev => {
        const { [listId]: _, ...rest } = prev;
        return rest;
      });
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (err) {
      // Optionally handle error
    } finally {
      setIsLoading(false);
    }
  }, [selectedList]);

  // Search contacts in the current list
  const searchInCurrentList = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!selectedList || !query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
      }
      if (!token) throw new Error('Not authenticated');
      const results = await searchContactsApi(token, query, selectedList.id);
      setSearchResults(results || []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedList]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    contactLists,
    contacts,
    selectedList,
    isLoading,
    searchResults,
    searchQuery,
    createContactList,
    selectContactList,
    addContactToList,
    addContactsToList,
    removeContactFromList: removeContactFromListFn,
    removeContactList: removeContactListFn,
    searchInCurrentList,
    clearSearch,
  };
}
