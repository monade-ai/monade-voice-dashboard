import { NextRequest, NextResponse } from 'next/server';

// Campaign Service API config
const CAMPAIGNS_API_BASE = 'http://35.200.254.189/campaigns';

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
        // Get the path after /api/campaigns/
        const url = new URL(request.url);
        const path = url.pathname.replace('/api/campaigns', '');
        const searchParams = url.search;

        const targetUrl = `${CAMPAIGNS_API_BASE}${path}${searchParams}`;
        console.log(`[Campaigns Proxy] ${method} ${targetUrl}`);

        // Build headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        // Add body for POST, PUT, PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                const body = await request.json();
                console.log(`[Campaigns Proxy] ${method} body:`, JSON.stringify(body));
                fetchOptions.body = JSON.stringify(body);
            } catch {
                // No body or invalid JSON - that's okay for some endpoints
            }
        }

        const response = await fetch(targetUrl, fetchOptions);
        const responseText = await response.text();

        if (!response.ok) {
            console.error(`[Campaigns Proxy] Backend returned ${response.status}:`, responseText);
        }

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
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    } catch (error) {
        console.error('[Campaigns Proxy] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Campaigns proxy error' },
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
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
