// src/app/contacts/utils/contacts-api.ts
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is installed or install it: npm install uuid @types/uuid

/**
 * Contacts API utility for CRUD operations, bulk import, and search.
 * All requests require a Supabase access token in the Authorization header.
 */

// const API_URL = process.env.NEXT_PUBLIC_CONTACTS_API_URL || 'http://localhost:7075/';

type Contact = {
  id: string; // Ensure id is always present for local storage
  name: string;
  phone: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
};

type ContactList = {
  id: string; // Ensure id is always present for local storage
  name: string;
  description?: string;
  count: number; // Keep track locally
  createdAt: Date; // Keep track locally
};

// function getAuthHeaders(token: string) {
//   return {
//     'Authorization': `Bearer ${token}`,
//     'Content-Type': 'application/json',
//   };
// }

// async function apiFetch(
//   endpoint: string,
//   method: string = 'GET',
//   token: string,
//   body?: any
// ) {
//   const res = await fetch(`${API_URL}${endpoint}`, {
//     method,
//     headers: getAuthHeaders(token),
//     body: body ? JSON.stringify(body) : undefined,
//   });

//   if (!res.ok) {
//     let errorDetail = '';
//     try {
//       const err = await res.json();
//       errorDetail = err.detail || JSON.stringify(err);
//     } catch {
//       errorDetail = res.statusText;
//     }
//     throw new Error(`API error: ${res.status} ${errorDetail}`);
//   }
//   return await res.json();
// }

// --- Commented out API functions ---

// // Contact Lists
// export async function getContactLists(token: string) {
//   return apiFetch('/contact-lists/', 'GET', token);
// }
// export async function createContactList(token: string, name: string, description?: string) {
//   return apiFetch('/contact-lists/', 'POST', token, { name, description });
// }
// export async function getContactList(token: string, listId: string) {
//   return apiFetch(`/contact-lists/${listId}`, 'GET', token);
// }
// export async function updateContactList(token: string, listId: string, name: string, description?: string) {
//   return apiFetch(`/contact-lists/${listId}`, 'PUT', token, { name, description });
// }
// export async function deleteContactList(token: string, listId: string) {
//   return apiFetch(`/contact-lists/${listId}`, 'DELETE', token);
// }
// export async function getListContacts(token: string, listId: string) {
//   return apiFetch(`/contact-lists/${listId}/contacts`, 'GET', token);
// }

// // Contacts
// export async function createContact(token: string, listId: string, contact: Omit<Contact, 'id'>) {
//   return apiFetch(`/contacts/list/${listId}`, 'POST', token, contact);
// }
// export async function getContact(token: string, contactId: string) {
//   return apiFetch(`/contacts/${contactId}`, 'GET', token);
// }
// export async function updateContact(token: string, contactId: string, contact: Omit<Contact, 'id'>) {
//   return apiFetch(`/contacts/${contactId}`, 'PUT', token, contact);
// }
// export async function deleteContact(token: string, contactId: string) {
//   return apiFetch(`/contacts/${contactId}`, 'DELETE', token);
// }
// export async function removeContactFromList(token: string, listId: string, contactId: string) {
//   return apiFetch(`/contacts/list/${listId}/${contactId}`, 'DELETE', token);
// }

// // Bulk Import
// export async function bulkCreateContacts(token: string, listId: string, contacts: Omit<Contact, 'id'>[]) {
//   return apiFetch(`/contacts/list/${listId}/bulk`, 'POST', token, { contacts });
// }

// // Search
// export async function searchContactsApi(token: string, query: string, listId?: string) {
//   const q = encodeURIComponent(query);
//   const listParam = listId ? `&list_id=${encodeURIComponent(listId)}` : '';
//   return apiFetch(`/contacts/search/?q=${q}${listParam}`, 'GET', token);
// }


// --- localStorage Functions ---

const CONTACT_LISTS_KEY = 'contact_lists';
const getContactsKey = (listId: string) => `contacts_${listId}`;

// Helper to get items from localStorage
function getStoredItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const item = localStorage.getItem(key);
  try {
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error parsing localStorage item "${key}":`, error);
    return null;
  }
}

// Helper to set items in localStorage
function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage item "${key}":`, error);
  }
}

// Contact Lists (LocalStorage)

export async function getContactListsFromStorage(): Promise<{ lists: ContactList[] }> {
  const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
  // Ensure dates are Date objects after parsing
  const listsWithDates = lists.map(list => ({
    ...list,
    createdAt: new Date(list.createdAt),
  }));
  return Promise.resolve({ lists: listsWithDates });
}

export async function createContactListInStorage(name: string, description?: string): Promise<ContactList> {
  const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
  const newList: ContactList = {
    id: uuidv4(),
    name,
    description: description || '',
    count: 0,
    createdAt: new Date(),
  };
  const updatedLists = [...lists, newList];
  setStoredItem(CONTACT_LISTS_KEY, updatedLists);
  // Initialize empty contacts for the new list
  setStoredItem(getContactsKey(newList.id), []);
  return Promise.resolve(newList);
}

// Not implementing getContactList (get details) for now, use getContactListsFromStorage and filter

export async function deleteContactListFromStorage(listId: string): Promise<void> {
  const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
  const updatedLists = lists.filter(list => list.id !== listId);
  setStoredItem(CONTACT_LISTS_KEY, updatedLists);
  // Remove associated contacts
  if (typeof window !== 'undefined') {
    localStorage.removeItem(getContactsKey(listId));
  }
  return Promise.resolve();
}

// Contacts (LocalStorage)

export async function getListContactsFromStorage(listId: string): Promise<Contact[]> {
  const contacts = getStoredItem<Contact[]>(getContactsKey(listId)) || [];
  // Ensure dates are Date objects after parsing
  const contactsWithDates = contacts.map(contact => ({
    ...contact,
    createdAt: contact.createdAt ? new Date(contact.createdAt) : undefined,
    updatedAt: contact.updatedAt ? new Date(contact.updatedAt) : undefined,
  }));
  return Promise.resolve(contactsWithDates);
}

export async function createContactInStorage(listId: string, contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
  const contacts = getStoredItem<Contact[]>(getContactsKey(listId)) || [];
  const newContact: Contact = {
    ...contactData,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const updatedContacts = [...contacts, newContact];
  setStoredItem(getContactsKey(listId), updatedContacts);

  // Update list count
  const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
  const updatedLists = lists.map(list =>
    list.id === listId ? { ...list, count: updatedContacts.length } : list
  );
  setStoredItem(CONTACT_LISTS_KEY, updatedLists);

  return Promise.resolve(newContact);
}

// Not implementing getContact (get details) for now

// Not implementing updateContact for now

export async function removeContactFromListInStorage(listId: string, contactId: string): Promise<void> {
  const contacts = getStoredItem<Contact[]>(getContactsKey(listId)) || [];
  const updatedContacts = contacts.filter(contact => contact.id !== contactId);
  setStoredItem(getContactsKey(listId), updatedContacts);

  // Update list count
  const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
  const updatedLists = lists.map(list =>
    list.id === listId ? { ...list, count: updatedContacts.length } : list
  );
  setStoredItem(CONTACT_LISTS_KEY, updatedLists);

  return Promise.resolve();
}

// Bulk Import (LocalStorage)

export async function bulkCreateContactsInStorage(listId: string, contactsData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Contact[]> {
  const contacts = getStoredItem<Contact[]>(getContactsKey(listId)) || [];
  const newContacts: Contact[] = contactsData.map(c => ({
    ...c,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const updatedContacts = [...contacts, ...newContacts];
  setStoredItem(getContactsKey(listId), updatedContacts);

  // Update list count
  const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
  const updatedLists = lists.map(list =>
    list.id === listId ? { ...list, count: updatedContacts.length } : list
  );
  setStoredItem(CONTACT_LISTS_KEY, updatedLists);

  return Promise.resolve(newContacts); // Return only the newly created ones for consistency? Or all? Let's return new ones.
}

// Search (LocalStorage)

export async function searchContactsInStorage(query: string, listId?: string): Promise<Contact[]> {
  const lowerCaseQuery = query.toLowerCase().trim();
  if (!lowerCaseQuery) return Promise.resolve([]);

  let contactsToSearch: Contact[] = [];

  if (listId) {
    // Search within a specific list
    contactsToSearch = getStoredItem<Contact[]>(getContactsKey(listId)) || [];
  } else {
    // Search across all lists (might be inefficient for many lists/contacts)
    const lists = getStoredItem<ContactList[]>(CONTACT_LISTS_KEY) || [];
    for (const list of lists) {
      const listContacts = getStoredItem<Contact[]>(getContactsKey(list.id)) || [];
      contactsToSearch.push(...listContacts);
    }
  }

  const results = contactsToSearch.filter(contact =>
    contact.name.toLowerCase().includes(lowerCaseQuery) ||
    contact.phone.toLowerCase().includes(lowerCaseQuery)
    // Add search in metadata if needed
    // (contact.metadata && Object.values(contact.metadata).some(val => String(val).toLowerCase().includes(lowerCaseQuery)))
  );

  return Promise.resolve(results);
}
