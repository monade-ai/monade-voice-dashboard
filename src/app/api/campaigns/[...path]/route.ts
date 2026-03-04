import { NextRequest, NextResponse } from 'next/server';

import {
  fetchMonadeProfileFromRequestHeaders,
  getServiceToken,
} from '@/lib/auth/server-auth';

const CAMPAIGN_API_BASE = process.env.CAMPAIGN_SERVICE_BASE_URL
  ?? 'https://service.monade.ai/campaigns/api/v1';
const DEBUG_CAMPAIGN_PROXY = process.env.NODE_ENV !== 'production';

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

function getMonitoringUserUid(path: string): string | null {
  const match = path.match(/^\/monitoring\/(queue-status|credit-status)\/([^/]+)/);
  if (!match) return null;

  return decodeURIComponent(match[2]);
}

function normalizeCampaignTarget(path: string, searchParams: URLSearchParams) {
  const normalizedBase = CAMPAIGN_API_BASE.replace(/\/+$/, '');
  let baseForPath = normalizedBase;
  let normalizedPath = path;

  // Guard against base URLs that already include "/campaigns"
  if (normalizedBase.endsWith('/campaigns')) {
    if (normalizedPath.startsWith('/campaigns')) {
      normalizedPath = normalizedPath.replace('/campaigns', '');
    } else if (normalizedPath.startsWith('/monitoring')) {
      baseForPath = normalizedBase.replace(/\/campaigns$/, '');
    }
  }

  if (normalizedPath === '/campaigns') {
    normalizedPath = '/campaigns/';
  }

  const search = searchParams.toString();

  return search
    ? `${baseForPath}${normalizedPath}?${search}`
    : `${baseForPath}${normalizedPath}`;
}

async function handleProxy(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const path = url.pathname.replace('/api/campaigns', '');
    const searchParams = new URLSearchParams(url.searchParams);
    const monitoringUserUid = getMonitoringUserUid(path);
    const requiresAuth = path.startsWith('/campaigns') || path.startsWith('/monitoring');

    const profile = requiresAuth
      ? await fetchMonadeProfileFromRequestHeaders(request.headers)
      : null;

    if (requiresAuth && !profile?.user_uid) {
      return NextResponse.json(
        { error: 'User is not authenticated.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const sessionUserUid = profile?.user_uid || null;
    const requestedUserUid = searchParams.get('user_uid');

    if (monitoringUserUid && sessionUserUid && monitoringUserUid !== sessionUserUid) {
      return NextResponse.json(
        { error: 'Access denied: User mismatch.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (requiresAuth && sessionUserUid) {
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

    const targetUrl = normalizeCampaignTarget(path, searchParams);
    const serviceToken = getServiceToken();
    if (requiresAuth && !serviceToken) {
      return NextResponse.json(
        { error: 'Server misconfigured: service token is not set.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const headers: HeadersInit = {};

    if (serviceToken) {
      headers['Authorization'] = `Bearer ${serviceToken}`;
      headers['X-API-Key'] = serviceToken;
    }

    if (sessionUserUid) {
      headers['X-User-Uid'] = sessionUserUid;
    }

    const contentType = request.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;
    const accept = request.headers.get('accept');
    if (accept) headers['Accept'] = accept;

    const fetchOptions: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      fetchOptions.body = request.body;
      fetchOptions.duplex = 'half';
    }

    if (DEBUG_CAMPAIGN_PROXY) {
      console.log('[CampaignProxy] request', {
        method: request.method,
        path,
        targetUrl,
        requestedUserUid,
        sessionUserUid,
        usingServiceToken: Boolean(serviceToken),
      });
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

    if (!response.ok && DEBUG_CAMPAIGN_PROXY) {
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
