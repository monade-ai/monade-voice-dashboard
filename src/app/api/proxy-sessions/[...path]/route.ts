import { NextRequest, NextResponse } from 'next/server';

const SESSION_API_BASE = process.env.SESSION_API_BASE_URL ?? 'https://service.monade.ai/session-manager';
const DEBUG_PROXY = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
    return handleProxy(request, 'GET');
}

export async function POST(request: NextRequest) {
    return handleProxy(request, 'POST');
}

function isNetworkError(error: unknown) {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('fetch failed') || message.includes('enotfound') || message.includes('enetunreach') || message.includes('econnrefused') || message.includes('aborted');
}

async function handleProxy(request: NextRequest, method: string) {
    try {
        const url = new URL(request.url);
        const path = url.pathname.replace('/api/proxy-sessions', '');
        const searchParams = url.search;

        const targetUrl = `${SESSION_API_BASE}${path}${searchParams}`;
        if (DEBUG_PROXY) {
            console.log(`[SessionProxy] ${method} ${targetUrl}`);
        }

        const headers: HeadersInit = {};
        const fetchOptions: RequestInit = { method, headers };

        if (method === 'POST') {
            try {
                const body = await request.json();
                fetchOptions.body = JSON.stringify(body);
                (headers as Record<string, string>)['Content-Type'] = 'application/json';
            } catch {
                // No body — that's fine for disconnect endpoints
            }
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

        return NextResponse.json(data, {
            status: response.status,
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error('[SessionProxy] Error:', error);
        const isNetwork = isNetworkError(error);
        const message = isNetwork
            ? 'Session manager service is unreachable.'
            : (error instanceof Error ? error.message : 'Proxy error');
        const status = isNetwork ? 503 : 500;

        return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
