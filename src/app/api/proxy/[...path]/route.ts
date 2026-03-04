import { NextRequest, NextResponse } from 'next/server';

import { buildForwardHeaders, getConfigServerBaseUrl } from '@/lib/auth/server-auth';

const DEBUG_PROXY = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
  return handleProxy(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleProxy(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleProxy(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request, 'DELETE');
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

async function handleProxy(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/proxy', '');
    const searchParams = url.search;
    const targetUrl = `${getConfigServerBaseUrl()}${path}${searchParams}`;

    if (DEBUG_PROXY) {
      console.log(`[Proxy] ${method} ${targetUrl}`);
    }

    const headers = buildForwardHeaders(request.headers, true);
    const fetchOptions: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      cache: 'no-store',
    };

    if (!['GET', 'HEAD'].includes(method)) {
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

    if (!response.ok && DEBUG_PROXY) {
      console.error(`[Proxy] Backend returned ${response.status}:`, data);
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    const isNetwork = isNetworkError(error);
    const message = isNetwork
      ? 'Upstream service is unreachable. Please try again later.'
      : (error instanceof Error ? error.message : 'Proxy error');
    const status = isNetwork ? 503 : 500;

    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
