type MonadeProfile = {
  user_uid: string;
  email?: string;
  name?: string;
  available_credits?: number;
  total_credits?: number;
};

const CONFIG_SERVER_BASE =
  process.env.MONADE_API_BASE_URL
  || process.env.NEXT_PUBLIC_CONFIG_SERVER_URL
  || process.env.NEXT_PUBLIC_MONADE_API_BASE_URL
  || 'https://service.monade.ai/db_services';

const SERVICE_TOKEN =
  process.env.CONFIG_SERVER_API_KEY
  || process.env.INTERNAL_SERVICE_API_KEY
  || process.env.SERVICE_API_KEY
  || process.env.CAMPAIGN_SERVICE_API_KEY
  || process.env.VOICE_AGENTS_API_KEY
  || '';

export function getConfigServerBaseUrl() {
  return CONFIG_SERVER_BASE.replace(/\/+$/, '');
}

export function getServiceToken() {
  return SERVICE_TOKEN;
}

export function hasBetterAuthSessionCookieFromRequest(
  requestCookies: { get: (name: string) => { value: string } | undefined },
) {
  const cookieNames = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
    '__Host-better-auth.session_token',
  ];

  return cookieNames.some((name) => Boolean(requestCookies.get(name)?.value));
}

export function buildForwardHeaders(requestHeaders: Headers, includeServiceToken = false): Headers {
  const headers = new Headers();
  const cookie = requestHeaders.get('cookie');
  const authHeader = requestHeaders.get('authorization');
  const xApiKey = requestHeaders.get('x-api-key');
  const contentType = requestHeaders.get('content-type');
  const accept = requestHeaders.get('accept');

  if (cookie) headers.set('Cookie', cookie);
  if (authHeader) headers.set('Authorization', authHeader);
  if (xApiKey) headers.set('X-API-Key', xApiKey);
  if (contentType) headers.set('Content-Type', contentType);
  if (accept) headers.set('Accept', accept);

  if (includeServiceToken && !cookie && !authHeader && !xApiKey && SERVICE_TOKEN) {
    headers.set('Authorization', `Bearer ${SERVICE_TOKEN}`);
    headers.set('X-API-Key', SERVICE_TOKEN);
  }

  return headers;
}

export async function fetchMonadeProfileFromRequestHeaders(
  requestHeaders: Headers,
): Promise<MonadeProfile | null> {
  const response = await fetch(`${getConfigServerBaseUrl()}/api/me`, {
    method: 'GET',
    headers: buildForwardHeaders(requestHeaders),
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!data?.user_uid) {
    return null;
  }

  return {
    user_uid: data.user_uid,
    email: data.email,
    name: data.name,
    available_credits: data.available_credits,
    total_credits: data.total_credits,
  };
}
