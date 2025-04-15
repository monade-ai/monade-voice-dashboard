import { useState, useEffect } from 'react';

import { searchContacts } from '../contacts/utils/search';

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
  createContactList: (name: string, description?: string) => ContactList;
  selectContactList: (listId: string | null) => void;
  addContactToList: (listId: string, contact: Omit<Contact, 'id'>) => Contact;
  addContactsToList: (listId: string, contacts: Omit<Contact, 'id'>[]) => Contact[];
  removeContactFromList: (listId: string, contactId: string) => void;
  removeContactList: (listId: string) => void;
  searchInCurrentList: (query: string) => void;
  clearSearch: () => void;
}

/**
 * Hook to manage contacts and contact lists
 */
export function useContacts({ 
  initialLists = [], 
  initialContacts = {}, 
}: UseContactsProps = {}): UseContactsReturn {
  // State
  const [contactLists, setContactLists] = useState<ContactList[]>(initialLists);
  const [contacts, setContacts] = useState<Record<string, Contact[]>>(initialContacts);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create a new contact list
  const createContactList = (name: string, description?: string): ContactList => {
    const newList: ContactList = {
      id: `list-${Date.now()}`,
      name,
      description,
      count: 0,
      createdAt: new Date(),
    };
    
    setContactLists(prev => [...prev, newList]);
    setContacts(prev => ({
      ...prev,
      [newList.id]: [],
    }));
    
    return newList;
  };

  // Select a contact list
  const selectContactList = (listId: string | null) => {
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
  };

  // Add a single contact to a list
  const addContactToList = (listId: string, contact: Omit<Contact, 'id'>): Contact => {
    const newContact: Contact = {
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
    
    setContacts(prev => {
      const listContacts = [...(prev[listId] || []), newContact];

      return {
        ...prev,
        [listId]: listContacts,
      };
    });
    
    // Update the count in contact list
    setContactLists(prev =>
      prev.map(list =>
        list.id === listId ? { ...list, count: list.count + 1 } : list,
      ),
    );
    
    return newContact;
  };

  // Add multiple contacts to a list
  const addContactsToList = (listId: string, newContacts: Omit<Contact, 'id'>[]): Contact[] => {
    const contactsWithIds: Contact[] = newContacts.map(contact => ({
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    }));
    
    setContacts(prev => {
      const listContacts = [...(prev[listId] || []), ...contactsWithIds];

      return {
        ...prev,
        [listId]: listContacts,
      };
    });
    
    // Update the count in contact list
    setContactLists(prev =>
      prev.map(list =>
        list.id === listId ? { ...list, count: list.count + contactsWithIds.length } : list,
      ),
    );
    
    return contactsWithIds;
  };

  // Remove a contact from a list
  const removeContactFromList = (listId: string, contactId: string) => {
    setContacts(prev => {
      const listContacts = prev[listId] || [];
      const updatedContacts = listContacts.filter(contact => contact.id !== contactId);

      return {
        ...prev,
        [listId]: updatedContacts,
      };
    });
    
    // Update the count in contact list
    setContactLists(prev =>
      prev.map(list =>
        list.id === listId ? { ...list, count: Math.max(0, list.count - 1) } : list,
      ),
    );
    
    // Update search results if applicable
    if (searchQuery) {
      setSearchResults(prev => prev.filter(contact => contact.id !== contactId));
    }
  };

  // Remove a contact list
  const removeContactList = (listId: string) => {
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
  };

  // Search contacts in the current list
  const searchInCurrentList = (query: string) => {
    setSearchQuery(query);
    
    if (!selectedList || !query.trim()) {
      setSearchResults([]);

      return;
    }
    
    const currentContacts = contacts[selectedList.id] || [];
    const results = searchContacts(currentContacts, query);
    setSearchResults(results);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Simulate API loading
  useEffect(() => {
    if (selectedList) {
      setIsLoading(true);
      // Simulate API delay
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [selectedList]);

  // Update search results when query changes
  useEffect(() => {
    if (selectedList && searchQuery) {
      const currentContacts = contacts[selectedList.id] || [];
      const results = searchContacts(currentContacts, searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedList, contacts]);

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
    removeContactFromList,
    removeContactList,
    searchInCurrentList,
    clearSearch,
  };
}

