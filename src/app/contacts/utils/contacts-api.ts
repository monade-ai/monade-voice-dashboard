const API_BASE_URL = process.env.NEXT_PUBLIC_DATABASE_URL || 'http://localhost:8000/contacts';

async function getSupabaseToken() {
  // In a real application, you would get this from your auth provider
  // For now, we'll use a placeholder.
  // Replace this with your actual Supabase token retrieval logic.
  return 'your_supabase_jwt';
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getSupabaseToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'An unknown error occurred');
  }

  return response.json();
}

export async function getBuckets() {
  return fetchWithAuth(`${API_BASE_URL}/buckets`);
}

export async function getContactsForBucket(bucketId: string) {
  return fetchWithAuth(`${API_BASE_URL}/buckets/${bucketId}/contacts`);
}

export async function createBucket(data: { name: string; description: string; fields: string[] }) {
  return fetchWithAuth(`${API_BASE_URL}/buckets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBucket(bucketId: string) {
  if (!bucketId) {
    throw new Error('deleteBucket called with undefined or empty bucketId');
  }
  return fetchWithAuth(`${API_BASE_URL}/buckets/${bucketId}`, {
    method: 'DELETE',
  });
}

export async function addContact(bucketId: string, contactData: { phone_number: string, data: Record<string, string> }) {
  return fetchWithAuth(`${API_BASE_URL}/buckets/${bucketId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(contactData),
  });
}

export async function addContactsBulk(bucketId: string, contacts: any[]) {
    const response = await fetch(`${API_BASE_URL}/buckets/${bucketId}/contacts/bulk`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getSupabaseToken()}`,
        },
        body: JSON.stringify(contacts),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'An unknown error occurred');
    }

    return response.json();
}

export async function deleteContact(bucketId: string, phoneNumber: string) {
  return fetchWithAuth(`${API_BASE_URL}/buckets/${bucketId}/contacts/${phoneNumber}`, {
    method: 'DELETE',
  });
}
