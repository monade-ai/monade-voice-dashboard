import { NextRequest, NextResponse } from 'next/server';

// Hardcoded Trunks API config
const TRUNKS_API_BASE = 'http://35.200.254.189/trunks';

export async function GET(request: NextRequest) {
  return handleProxy(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleProxy(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleProxy(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request, 'DELETE');
}

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('fetch failed') || message.includes('enotfound') || message.includes('enetunreach') || message.includes('econnrefused') || message.includes('aborted');
}

async function handleProxy(request: NextRequest, method: string) {
  try {
    // Get the path after /api/proxy-trunks/
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/proxy-trunks', '');
    const searchParams = url.search;

    const targetUrl = `${TRUNKS_API_BASE}${path}${searchParams}`;
    console.log(`[TrunksProxy] ${method} ${targetUrl}`);

    const headers: HeadersInit = {};

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for POST, PUT
    if (['POST', 'PUT'].includes(method)) {
      try {
        const body = await request.json();
        fetchOptions.body = JSON.stringify(body);
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
      } catch {
        // No body or invalid JSON
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(targetUrl, { ...fetchOptions, signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
    const responseText = await response.text();

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[TrunksProxy] Error:', error);
    const isNetwork = isNetworkError(error);
    const message = isNetwork
      ? 'Upstream trunk service is unreachable. Please try again later.'
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
