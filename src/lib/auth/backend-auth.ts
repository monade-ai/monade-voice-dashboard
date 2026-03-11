const API_BASE = process.env.NEXT_PUBLIC_MONADE_API_BASE_URL || 'https://service.monade.ai/db_services';

type AuthErrorPayload = {
  detail?: string;
  message?: string;
  error?: string;
  error_message?: string;
};

async function parseError(response: Response) {
  let payload: AuthErrorPayload | null = null;
  try {
    payload = (await response.json()) as AuthErrorPayload;
  } catch {
    payload = null;
  }

  return payload?.error_message
    || payload?.detail
    || payload?.message
    || payload?.error
    || `Request failed (${response.status})`;
}

export async function backendSignUp(params: { username: string; email: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.username,
      email: params.email,
      password: params.password,
    }),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}

export async function backendSignIn(params: { email: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}

export async function backendSignOut() {
  const response = await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function backendGetMe() {
  const response = await fetch(`${API_BASE}/api/me`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}

export async function backendGetSession() {
  const response = await fetch(`${API_BASE}/api/auth/get-session`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}
