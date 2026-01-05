import { NextRequest, NextResponse } from 'next/server';

// Hardcoded Monade API config
const MONADE_API_BASE = 'http://35.200.254.189/db_services';
const MONADE_API_KEY = 'monade_d8325992-cf93-4cdd-9c54-34ca18d72441';

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

async function handleProxy(request: NextRequest, method: string) {
    try {
        // Get the path after /api/proxy/
        const url = new URL(request.url);
        const path = url.pathname.replace('/api/proxy', '');
        const searchParams = url.search;

        const targetUrl = `${MONADE_API_BASE}${path}${searchParams}`;
        console.log(`[Proxy] ${method} ${targetUrl}`);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-API-Key': MONADE_API_KEY,
        };

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        // Add body for POST, PUT, PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                const body = await request.json();
                fetchOptions.body = JSON.stringify(body);
            } catch {
                // No body or invalid JSON
            }
        }

        const response = await fetch(targetUrl, fetchOptions);
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
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            }
        });
    } catch (error) {
        console.error('[Proxy] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Proxy error' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
    });
}
