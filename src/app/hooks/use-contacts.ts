import { useState, useEffect, useCallback } from 'react';
import {
  // getContactLists,
  // createContactList as apiCreateContactList,
  // getListContacts,
  // createContact,
  // bulkCreateContacts,
  // updateContactList as apiUpdateContactList,
  // deleteContactList as apiDeleteContactList,
  // getContact,
  // updateContact,
  // deleteContact,
  // removeContactFromList,
  // searchContactsApi,
  // --- Import LocalStorage functions ---
  getContactListsFromStorage,
  createContactListInStorage,
  getListContactsFromStorage,
  createContactInStorage,
  bulkCreateContactsInStorage,
  deleteContactListFromStorage,
  removeContactFromListInStorage,
  searchContactsInStorage,
} from '@/app/contacts/utils/contacts-api';
import { useAuth } from '@/lib/auth/AuthProvider';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  [key: string]: any; // Keep for flexibility, though localStorage might not store complex objects reliably without careful stringification
  createdAt?: Date;
  updatedAt?: Date;
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
  addContactToList: (listId: string, contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact | null>; // Adjusted type
  addContactsToList: (listId: string, contacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<Contact[]>; // Adjusted type
  removeContactFromList: (listId: string, contactId: string) => Promise<void>;
  removeContactList: (listId: string) => Promise<void>;
  searchInCurrentList: (query: string) => Promise<void>;
  clearSearch: () => void;
}

/**
 * localStorage-driven hook to manage contacts and contact lists
 */
export function useContacts({
  initialLists = [],
  initialContacts = {},
}: UseContactsProps = {}): UseContactsReturn {
  const { currentOrganization } = useAuth();
  const [contactLists, setContactLists] = useState<ContactList[]>(initialLists);
  const [contacts, setContacts] = useState<Record<string, Contact[]>>(initialContacts);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load all contact lists and their contacts from localStorage on mount and when organization changes
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch if we have an organization context
      if (!currentOrganization?.id) {
        setContactLists([]);
        setContacts({});
        setSelectedList(null);
        setSearchResults([]);
        setSearchQuery('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const listsRes = await getContactListsFromStorage();
        const lists: ContactList[] = listsRes.lists || [];
        setContactLists(lists);

        // Fetch contacts for each list from storage
        const contactsObj: Record<string, Contact[]> = {};
        for (const list of lists) {
          const contactsRes = await getListContactsFromStorage(list.id);
          contactsObj[list.id] = contactsRes || [];
        }
        setContacts(contactsObj);
      } catch (err) {
        console.error('Error loading data from localStorage:', err);
        // Optionally handle error: clear state or show message
        setContactLists([]);
        setContacts({});
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentOrganization?.id]); // Refresh when organization changes

  // Create a new contact list in storage
  const createContactList = useCallback(async (name: string, description?: string): Promise<ContactList | null> => {
    setIsLoading(true);
    try {
      console.log('[createContactList] called with:', { name, description });
      // No token needed
      const newList = await createContactListInStorage(name, description);
      console.log('[createContactList] localStorage response:', newList);

      // Update state
      setContactLists(prev => [...prev, newList]);
      setContacts(prev => ({ ...prev, [newList.id]: [] })); // Initialize contacts for the new list in state
      return newList;
    } catch (err) {
      console.error('[createContactList] error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Select a contact list (no change needed, purely state management)
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

  // Add a single contact to a list in storage
  const addContactToList = useCallback(async (listId: string, contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact | null> => {
    setIsLoading(true);
    try {
      // No token needed
      const newContact = await createContactInStorage(listId, contact);

      // Update state (storage function already updated list count)
      setContacts(prev => ({
        ...prev,
        [listId]: [...(prev[listId] || []), newContact],
      }));
      // Fetch updated list count from storage or rely on storage function (simpler)
      const listsRes = await getContactListsFromStorage();
      setContactLists(listsRes.lists || []);

      return newContact;
    } catch (err) {
      console.error('[addContactToList] error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add multiple contacts to a list in storage (bulk import)
  const addContactsToList = useCallback(async (listId: string, newContactsData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Contact[]> => {
    setIsLoading(true);
    try {
      // No token needed
      const createdContacts = await bulkCreateContactsInStorage(listId, newContactsData);

      // Re-fetch contacts for the list from storage to update state
      const updatedContacts = await getListContactsFromStorage(listId);
      setContacts(prev => ({
        ...prev,
        [listId]: updatedContacts,
      }));

      // Fetch updated list count from storage
      const listsRes = await getContactListsFromStorage();
      setContactLists(listsRes.lists || []);

      return createdContacts; // Return the contacts that were added
    } catch (err) {
      console.error('[addContactsToList] error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove a contact from a list in storage
  const removeContactFromListFn = useCallback(async (listId: string, contactId: string) => {
    setIsLoading(true);
    try {
      // No token needed
      await removeContactFromListInStorage(listId, contactId);

      // Update state
      setContacts(prev => {
        const listContacts = prev[listId] || [];
        const updatedContacts = listContacts.filter(contact => contact.id !== contactId);
        return {
          ...prev,
          [listId]: updatedContacts,
        };
      });
      // Fetch updated list count from storage
      const listsRes = await getContactListsFromStorage();
      setContactLists(listsRes.lists || []);

      // Update search results if the removed contact was present
      if (searchQuery) {
        setSearchResults(prev => prev.filter(contact => contact.id !== contactId));
      }
    } catch (err) {
      console.error('[removeContactFromListFn] error:', err);
      // Optionally handle error
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Remove a contact list from storage
  const removeContactListFn = useCallback(async (listId: string) => {
    setIsLoading(true);
    try {
      // No token needed
      await deleteContactListFromStorage(listId);

      // Update state
      setContactLists(prev => prev.filter(list => list.id !== listId));
      setContacts(prev => {
        const { [listId]: _, ...rest } = prev;
        return rest;
      });

      // Clear selection if the deleted list was selected
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('[removeContactListFn] error:', err);
      // Optionally handle error
    } finally {
      setIsLoading(false);
    }
  }, [selectedList]);

  // Search contacts in storage for the current list
  const searchInCurrentList = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!selectedList || !query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      // No token needed
      const results = await searchContactsInStorage(query, selectedList.id);
      setSearchResults(results || []);
    } catch (err) { // Although storage functions are Promise-based, catch errors just in case
      console.error('[searchInCurrentList] error:', err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedList]);

  // Clear search (no change needed)
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
