import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_MONADE_API_BASE_URL || 'https://service.monade.ai/db_services';

type ErrorPayload = {
  detail?: string;
  message?: string;
  error?: string;
  error_message?: string;
};

async function parseError(response: Response) {
  let payload: ErrorPayload | null = null;
  try {
    payload = (await response.json()) as ErrorPayload;
  } catch {
    payload = null;
  }
  return payload?.error_message
    || payload?.detail
    || payload?.message
    || payload?.error
    || `Request failed (${response.status})`;
}

async function sessionHeaders() {
  const store = await cookies();
  const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  return {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
}

export async function backendServerGetMe() {
  const response = await fetch(`${API_BASE}/api/me`, {
    method: 'GET',
    headers: await sessionHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}

export async function backendServerSignOut() {
  const response = await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: 'POST',
    headers: await sessionHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
