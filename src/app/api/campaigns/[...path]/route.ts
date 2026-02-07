import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

const CAMPAIGN_API_BASE = process.env.CAMPAIGN_SERVICE_BASE_URL
  ?? 'http://35.200.254.189/campaigns/api/v1';

const MONADE_API_BASE = MONADE_API_CONFIG.BASE_URL;
const MONADE_API_KEY = process.env.MONADE_API_KEY;

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}

export async function PUT(request: NextRequest) {
  return handleProxy(request);
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request);
}

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return message.includes('fetch failed')
    || message.includes('enotfound')
    || message.includes('enetunreach')
    || message.includes('econnrefused')
    || message.includes('aborted');
}

async function resolveSessionUserUid(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const userEmail = user.email;
  const response = await fetch(
    `${MONADE_API_BASE}/api/users/email/${encodeURIComponent(userEmail)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MONADE_API_KEY,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  return data.user_uid || data.user?.user_uid || null;
}

async function resolveUserApiKey(userUid: string): Promise<string | null> {
  const endpoint = `${MONADE_API_BASE}/api/users/${encodeURIComponent(userUid)}/api-keys`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const unauthResponse = await fetch(endpoint, { method: 'GET', headers });
  let response = unauthResponse;

  if (!response.ok && (response.status === 401 || response.status === 403) && MONADE_API_KEY) {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        ...headers,
        'X-API-Key': MONADE_API_KEY,
      },
    });
  }

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => ([]));
  const keys = Array.isArray(data) ? data : data.api_keys || [];
  const scopedKeys = keys.filter((key: any) => (
    !key?.user_uid || key?.user_uid === userUid
  ));
  const activeKey = scopedKeys.find((key: any) => (
    (key?.is_active ?? key?.isActive ?? true)
      && (key?.api_key || key?.key || typeof key === 'string')
  )) ?? scopedKeys[0];
  const keyValue = activeKey?.api_key || activeKey?.key || activeKey;

  return keyValue ? String(keyValue) : null;
}

function getMonitoringUserUid(path: string): string | null {
  const match = path.match(/^\/monitoring\/(queue-status|credit-status)\/([^/]+)/);
  if (!match) return null;

  return decodeURIComponent(match[2]);
}

async function handleProxy(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const path = url.pathname.replace('/api/campaigns', '');
    const searchParams = new URLSearchParams(url.searchParams);

    const monitoringUserUid = getMonitoringUserUid(path);
    const requiresAuth = path.startsWith('/campaigns') || path.startsWith('/monitoring');

    if (requiresAuth && !MONADE_API_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: MONADE_API_KEY is not set.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const sessionUserUid = requiresAuth ? await resolveSessionUserUid() : null;
    const userApiKey = requiresAuth && sessionUserUid
      ? await resolveUserApiKey(sessionUserUid)
      : null;
    const requestedUserUid = searchParams.get('user_uid');

    console.log('[CampaignProxy] request', {
      method: request.method,
      path,
      requestedUserUid,
      sessionUserUid,
      hasUserApiKey: Boolean(userApiKey),
      monitoringUserUid,
    });

    if (requiresAuth && !sessionUserUid) {
      return NextResponse.json(
        { error: 'User is not authenticated.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (requiresAuth && !userApiKey) {
      return NextResponse.json(
        { error: 'No active API key found for user.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (monitoringUserUid && sessionUserUid && monitoringUserUid !== sessionUserUid) {
      return NextResponse.json(
        { error: 'Access denied: User mismatch.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (path.startsWith('/campaigns') && sessionUserUid) {
      if (requestedUserUid && requestedUserUid !== sessionUserUid) {
        return NextResponse.json(
          { error: 'Access denied: User mismatch.' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      if (!requestedUserUid) {
        searchParams.set('user_uid', sessionUserUid);
      }
    }
    if (path.startsWith('/monitoring') && sessionUserUid) {
      if (requestedUserUid && requestedUserUid !== sessionUserUid) {
        return NextResponse.json(
          { error: 'Access denied: User mismatch.' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      if (!requestedUserUid) {
        searchParams.set('user_uid', sessionUserUid);
      }
    }

    const search = searchParams.toString();
    const normalizedBase = CAMPAIGN_API_BASE.replace(/\/+$/, '');
    let baseForPath = normalizedBase;
    let normalizedPath = path;

    // Guard against misconfigured base URLs that already include "/campaigns"
    if (normalizedBase.endsWith('/campaigns')) {
      if (normalizedPath.startsWith('/campaigns')) {
        normalizedPath = normalizedPath.replace('/campaigns', '');
      } else if (normalizedPath.startsWith('/monitoring')) {
        baseForPath = normalizedBase.replace(/\/campaigns$/, '');
      }
    }

    // Normalize list/create path to include trailing slash for upstream compatibility.
    if (normalizedPath === '/campaigns') {
      normalizedPath = '/campaigns/';
    }

    const targetUrl = search
      ? `${baseForPath}${normalizedPath}?${search}`
      : `${baseForPath}${normalizedPath}`;

    const headers: HeadersInit = {};
    if (userApiKey) {
      headers['Authorization'] = `Bearer ${userApiKey}`;
      headers['X-API-Key'] = userApiKey;
    }

    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const accept = request.headers.get('accept');
    if (accept) {
      headers['Accept'] = accept;
    }

    const fetchOptions: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      fetchOptions.body = request.body;
      fetchOptions.duplex = 'half';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(targetUrl, { ...fetchOptions, signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      console.warn('[CampaignProxy] upstream error', {
        status: response.status,
        statusText: response.statusText,
        targetUrl,
      });
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const isNetwork = isNetworkError(error);
    const message = isNetwork
      ? 'Upstream campaign service is unreachable. Please try again later.'
      : (error instanceof Error ? error.message : 'Proxy error');
    const status = isNetwork ? 503 : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
