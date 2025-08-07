import { getAccessToken } from '@/lib/auth/auth';

// Remove trailing /api if it exists since we'll add it in the endpoint calls
const API_BASE_URL = (process.env.NEXT_PUBLIC_DATABASE_URL || 'http://localhost:8764').replace(/\/api$/, '');

async function getSupabaseToken() {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return token;
  } catch (error) {
    console.error('Error getting Supabase token:', error);
    throw new Error('Authentication failed');
  }
}

function getOrganizationContext(): { organizationId?: string } {
  // Get organization context from localStorage or auth provider
  if (typeof window !== 'undefined') {
    const orgId = localStorage.getItem('current_organization_id');

    return orgId ? { organizationId: orgId } : {};
  }

  return {};
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    const token = await getSupabaseToken();
    const orgContext = getOrganizationContext();

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
      ...(orgContext.organizationId && { 'X-Organization-ID': orgContext.organizationId }),
      ...options.headers,
    };

    console.log(`[fetchWithAuth] Making request to: ${url}`);
    console.log(`[fetchWithAuth] Headers:`, headers);

    const response = await fetch(url, { ...options, headers });

    console.log(`[fetchWithAuth] Response status: ${response.status}`);

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error(`[fetchWithAuth] Error response:`, errorData);
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[fetchWithAuth] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[fetchWithAuth] Request failed:`, error);

    // If authentication fails, try without auth as fallback
    if (error.message.includes('Authentication failed') || error.message.includes('No authentication token')) {
      console.log(`[fetchWithAuth] Trying request without authentication...`);

      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }

    throw error;
  }
}

export async function getBuckets() {
  return fetchWithAuth(`${API_BASE_URL}/api/buckets`);
}

export async function getContactsForBucket(bucketId: string) {
  return fetchWithAuth(`${API_BASE_URL}/api/buckets/${bucketId}/contacts`);
}

export async function createBucket(data: { name: string; description: string; fields: string[] }) {
  return fetchWithAuth(`${API_BASE_URL}/api/buckets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBucket(bucketId: string) {
  if (!bucketId) {
    throw new Error('deleteBucket called with undefined or empty bucketId');
  }

  return fetchWithAuth(`${API_BASE_URL}/api/buckets/${bucketId}`, {
    method: 'DELETE',
  });
}

export async function addContact(bucketId: string, contactData: { phone_number: string, data: Record<string, string> }) {
  return fetchWithAuth(`${API_BASE_URL}/api/buckets/${bucketId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(contactData),
  });
}

export async function addContactsBulk(bucketId: string, contacts: any[]) {
  return fetchWithAuth(`${API_BASE_URL}/api/buckets/${bucketId}/contacts/bulk`, {
    method: 'POST',
    body: JSON.stringify(contacts),
  });
}

export async function deleteContact(bucketId: string, phoneNumber: string) {
  return fetchWithAuth(`${API_BASE_URL}/api/buckets/${bucketId}/contacts/${phoneNumber}`, {
    method: 'DELETE',
  });
}

// LocalStorage-based functions with organization context
function getStorageKey(key: string): string {
  const orgContext = getOrganizationContext();

  return orgContext.organizationId ? `${key}_${orgContext.organizationId}` : key;
}

export async function getContactListsFromStorage(): Promise<{ lists: any[] }> {
  if (typeof window === 'undefined') return { lists: [] };

  const storageKey = getStorageKey('contact_lists');
  const stored = localStorage.getItem(storageKey);

  return stored ? JSON.parse(stored) : { lists: [] };
}

export async function createContactListInStorage(name: string, description?: string): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');

  const newList = {
    id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name,
    description: description || '',
    count: 0,
    createdAt: new Date().toISOString(),
    fields: ['name', 'email'], // default fields
  };

  const storageKey = getStorageKey('contact_lists');
  const existing = await getContactListsFromStorage();
  const updated = { lists: [...existing.lists, newList] };

  localStorage.setItem(storageKey, JSON.stringify(updated));

  return newList;
}

export async function getListContactsFromStorage(listId: string): Promise<any[]> {
  if (typeof window === 'undefined') return [];

  const storageKey = getStorageKey(`contacts_${listId}`);
  const stored = localStorage.getItem(storageKey);

  return stored ? JSON.parse(stored) : [];
}

export async function createContactInStorage(listId: string, contact: any): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');

  const newContact = {
    id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    ...contact,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to contacts list
  const contactsKey = getStorageKey(`contacts_${listId}`);
  const existingContacts = await getListContactsFromStorage(listId);
  const updatedContacts = [...existingContacts, newContact];
  localStorage.setItem(contactsKey, JSON.stringify(updatedContacts));

  // Update list count
  const listsKey = getStorageKey('contact_lists');
  const listsData = await getContactListsFromStorage();
  const updatedLists = listsData.lists.map(list =>
    list.id === listId ? { ...list, count: updatedContacts.length } : list,
  );
  localStorage.setItem(listsKey, JSON.stringify({ lists: updatedLists }));

  return newContact;
}

export async function bulkCreateContactsInStorage(listId: string, contacts: any[]): Promise<any[]> {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');

  const newContacts = contacts.map(contact => ({
    id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    ...contact,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Add to contacts list
  const contactsKey = getStorageKey(`contacts_${listId}`);
  const existingContacts = await getListContactsFromStorage(listId);
  const updatedContacts = [...existingContacts, ...newContacts];
  localStorage.setItem(contactsKey, JSON.stringify(updatedContacts));

  // Update list count
  const listsKey = getStorageKey('contact_lists');
  const listsData = await getContactListsFromStorage();
  const updatedLists = listsData.lists.map(list =>
    list.id === listId ? { ...list, count: updatedContacts.length } : list,
  );
  localStorage.setItem(listsKey, JSON.stringify({ lists: updatedLists }));

  return newContacts;
}

export async function deleteContactListFromStorage(listId: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');

  // Remove contacts
  const contactsKey = getStorageKey(`contacts_${listId}`);
  localStorage.removeItem(contactsKey);

  // Remove from lists
  const listsKey = getStorageKey('contact_lists');
  const listsData = await getContactListsFromStorage();
  const updatedLists = listsData.lists.filter(list => list.id !== listId);
  localStorage.setItem(listsKey, JSON.stringify({ lists: updatedLists }));
}

export async function removeContactFromListInStorage(listId: string, contactId: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not in browser environment');

  // Remove from contacts list
  const contactsKey = getStorageKey(`contacts_${listId}`);
  const existingContacts = await getListContactsFromStorage(listId);
  const updatedContacts = existingContacts.filter(contact => contact.id !== contactId);
  localStorage.setItem(contactsKey, JSON.stringify(updatedContacts));

  // Update list count
  const listsKey = getStorageKey('contact_lists');
  const listsData = await getContactListsFromStorage();
  const updatedLists = listsData.lists.map(list =>
    list.id === listId ? { ...list, count: updatedContacts.length } : list,
  );
  localStorage.setItem(listsKey, JSON.stringify({ lists: updatedLists }));
}

export async function searchContactsInStorage(query: string, listId: string): Promise<any[]> {
  if (typeof window === 'undefined') return [];

  const contacts = await getListContactsFromStorage(listId);
  const lowerQuery = query.toLowerCase();

  return contacts.filter(contact => {
    // Search in all contact fields
    const searchableText = [
      contact.name,
      contact.phone,
      contact.email,
      ...Object.values(contact.data || {}),
    ].join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}
