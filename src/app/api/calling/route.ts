import { NextRequest, NextResponse } from 'next/server';

// Hardcoded Voice Agents config for Vercel deployment
const VOICE_AGENTS_URL = 'http://35.200.254.189/voice_agents';
const API_KEY = 'monade_d8325992-cf93-4cdd-9c54-34ca18d72441';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone_number, callee_info, assistant_id } = body;

        console.log('[API /calling] Received request:', { phone_number, assistant_id, callee_info });

        if (!phone_number) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            );
        }

        if (!assistant_id) {
            return NextResponse.json(
                { error: 'Assistant ID is required' },
                { status: 400 }
            );
        }

        // Format phone number - add + prefix if not present
        let formattedPhone = phone_number.trim();
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        // Add country code if just 10 digits (Indian number)
        if (formattedPhone.length === 11 && formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone.substring(1);
        }

        // Build the URL with phone number in path
        const callUrl = `${VOICE_AGENTS_URL}/outbound-call/${encodeURIComponent(formattedPhone)}`;

        // Prepare the payload
        const payload = {
            assistant_id,
            metadata: callee_info || {},
        };

        console.log('[API /calling] Forwarding to Voice Agents:', callUrl);
        console.log('[API /calling] Payload:', JSON.stringify(payload));

        const response = await fetch(callUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('[API /calling] Voice Agents response:', response.status, responseText);

        if (!response.ok) {
            let errorMessage = 'Failed to initiate call';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
            } catch {
                errorMessage = responseText || errorMessage;
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { message: 'Call initiated successfully', raw: responseText };
        }

        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        console.error('[API /calling] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
