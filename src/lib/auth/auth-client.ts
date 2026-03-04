import { createAuthClient } from 'better-auth/react';
import { apiKeyClient } from '@better-auth/api-key/client';

const CONFIG_SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_CONFIG_SERVER_URL
  || process.env.NEXT_PUBLIC_MONADE_API_BASE_URL
  || 'https://service.monade.ai/db_services';

export const authClient = createAuthClient({
  baseURL: CONFIG_SERVER_BASE_URL,
  plugins: [apiKeyClient()],
});

export const useSession = authClient.useSession;

export async function signInEmail(email: string, password: string) {
  return authClient.signIn.email({
    email,
    password,
  });
}

export async function signUpEmail(email: string, password: string, name?: string) {
  return authClient.signUp.email({
    email,
    password,
    name: name || email.split('@')[0] || 'User',
  });
}

export async function signOutSession() {
  return authClient.signOut();
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  const response = await fetch(`${CONFIG_SERVER_BASE_URL}/api/auth/forget-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      redirectTo: redirectTo || `${window.location.origin}/login`,
    }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Failed to send password reset link.';
    throw new Error(message);
  }

  return payload;
}

export async function listApiKeys() {
  const response = await fetch('/api/proxy/api/auth/api-key/list', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Failed to list API keys.');
  }

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.keys)) return data.keys;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.keys)) return data.data.keys;

  return [];
}

export async function createApiKey(name: string) {
  const response = await fetch('/api/proxy/api/auth/api-key/create', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Failed to create API key.');
  }

  return data;
}

export async function deleteApiKeyById(keyId: string) {
  const response = await fetch('/api/proxy/api/auth/api-key/delete', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ keyId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Failed to delete API key.');
  }

  return data;
}
