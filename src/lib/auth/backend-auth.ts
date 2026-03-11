const API_BASE = process.env.NEXT_PUBLIC_MONADE_API_BASE_URL || 'https://service.monade.ai/db_services';

type AuthErrorPayload = {
  detail?: string;
  message?: string;
  error?: string;
  error_message?: string;
  error_code?: string;
};

export class BackendAuthError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'BackendAuthError';
    this.status = status;
    this.code = code;
  }
}

async function parseError(response: Response) {
  let payload: AuthErrorPayload | null = null;
  try {
    payload = (await response.json()) as AuthErrorPayload;
  } catch {
    payload = null;
  }

  const message = payload?.error_message
    || payload?.detail
    || payload?.message
    || payload?.error
    || `Request failed (${response.status})`;
  const code = payload?.error_code;

  return { message, code };
}

async function throwParsedError(response: Response): Promise<never> {
  const parsed = await parseError(response);
  throw new BackendAuthError(parsed.message, response.status, parsed.code);
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
    await throwParsedError(response);
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
    await throwParsedError(response);
  }
  return response.json();
}

export async function backendLinkSelf(params?: { username?: string }) {
  const body = params?.username ? { username: params.username } : {};
  const response = await fetch(`${API_BASE}/api/users/link-self`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!response.ok) {
    await throwParsedError(response);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return response.json();
}

export async function backendSignOut() {
  const response = await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    await throwParsedError(response);
  }
}

export async function backendGetMe() {
  const response = await fetch(`${API_BASE}/api/me`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    await throwParsedError(response);
  }
  return response.json();
}

export async function backendGetSession() {
  const response = await fetch(`${API_BASE}/api/auth/get-session`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    await throwParsedError(response);
  }
  return response.json();
}
