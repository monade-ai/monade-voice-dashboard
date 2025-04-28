// src/app/contacts/utils/contacts-api.ts

/**
 * Contacts API utility for CRUD operations, bulk import, and search.
 * All requests require a Supabase access token in the Authorization header.
 */

const API_URL = process.env.NEXT_PUBLIC_CONTACTS_API_URL ;

type Contact = {
  id?: string;
  name: string;
  phone: string;
  metadata?: Record<string, any>;
};

type ContactList = {
  id?: string;
  name: string;
  description?: string;
};

function getAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function apiFetch(
  endpoint: string,
  method: string = 'GET',
  token: string,
  body?: any
) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: getAuthHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const err = await res.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = res.statusText;
    }
    throw new Error(`API error: ${res.status} ${errorDetail}`);
  }
  return await res.json();
}

// Contact Lists

export async function getContactLists(token: string) {
  return apiFetch('/contact-lists/', 'GET', token);
}

export async function createContactList(token: string, name: string, description?: string) {
  return apiFetch('/contact-lists/', 'POST', token, { name, description });
}

export async function getContactList(token: string, listId: string) {
  return apiFetch(`/contact-lists/${listId}`, 'GET', token);
}

export async function updateContactList(token: string, listId: string, name: string, description?: string) {
  return apiFetch(`/contact-lists/${listId}`, 'PUT', token, { name, description });
}

export async function deleteContactList(token: string, listId: string) {
  return apiFetch(`/contact-lists/${listId}`, 'DELETE', token);
}

export async function getListContacts(token: string, listId: string) {
  return apiFetch(`/contact-lists/${listId}/contacts`, 'GET', token);
}

// Contacts

export async function createContact(token: string, listId: string, contact: Omit<Contact, 'id'>) {
  return apiFetch(`/contacts/list/${listId}`, 'POST', token, contact);
}

export async function getContact(token: string, contactId: string) {
  return apiFetch(`/contacts/${contactId}`, 'GET', token);
}

export async function updateContact(token: string, contactId: string, contact: Omit<Contact, 'id'>) {
  return apiFetch(`/contacts/${contactId}`, 'PUT', token, contact);
}

export async function deleteContact(token: string, contactId: string) {
  return apiFetch(`/contacts/${contactId}`, 'DELETE', token);
}

export async function removeContactFromList(token: string, listId: string, contactId: string) {
  return apiFetch(`/contacts/list/${listId}/${contactId}`, 'DELETE', token);
}

// Bulk Import

export async function bulkCreateContacts(token: string, listId: string, contacts: Omit<Contact, 'id'>[]) {
  return apiFetch(`/contacts/list/${listId}/bulk`, 'POST', token, { contacts });
}

// Search

export async function searchContactsApi(token: string, query: string, listId?: string) {
  const q = encodeURIComponent(query);
  const listParam = listId ? `&list_id=${encodeURIComponent(listId)}` : '';
  return apiFetch(`/contacts/search/?q=${q}${listParam}`, 'GET', token);
}
