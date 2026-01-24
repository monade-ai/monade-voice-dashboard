import { NextRequest, NextResponse } from 'next/server';

// Voice Agents API for making outbound calls
const VOICE_AGENTS_URL = 'http://35.200.254.189/voice_agents';

// Trunk name mapping - map UI selection to actual trunk names registered in backend
const TRUNK_NAME_MAP: Record<string, string> = {
    'twilio': 'Twilio',       // Actual registered name
    'vobiz': 'Vobiz-SIP',     // Actual registered name
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            phone_number,      // Target phone number to call
            callee_info,       // Metadata about the callee (name, etc.)
            assistant_id,      // Assistant ID (required)
            trunk_name,        // Selected trunk: 'twilio' or 'vobiz' from UI dropdown
            api_key,           // User's API key for billing/transcripts
        } = body;

        console.log('[API /calling] Received request:', {
            phone_number,
            assistant_id,
            trunk_name,
            api_key: api_key ? `${api_key.substring(0, 20)}...` : 'NOT PROVIDED',
            callee_info
        });

        // Validate required fields
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

        if (!api_key) {
            return NextResponse.json(
                { error: 'API key is required for billing. Please ensure you have an API key.' },
                { status: 400 }
            );
        }

        // Format target phone number
        let formattedPhone = phone_number.trim();
        // Remove any non-digit characters except + at the start
        formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
        if (!formattedPhone.startsWith('+')) {
            // If 10 digits, assume Indian number
            if (formattedPhone.length === 10) {
                formattedPhone = '+91' + formattedPhone;
            } else {
                formattedPhone = '+' + formattedPhone;
            }
        }

        // Map trunk name from UI selection to actual trunk name
        const resolvedTrunkName = TRUNK_NAME_MAP[trunk_name?.toLowerCase()] || trunk_name || 'Vobiz-SIP';

        console.log('[API /calling] Using Voice Agents API with trunk:', resolvedTrunkName);

        // Build the correct API URL and payload per Shashwat's spec
        const callUrl = `${VOICE_AGENTS_URL}/outbound-call/${encodeURIComponent(formattedPhone)}`;

        const payload = {
            assistant_id: assistant_id,
            metadata: callee_info || {},
            telephony: {
                trunk_name: resolvedTrunkName
            }
        };

        console.log('[API /calling] Calling Voice Agents API:', callUrl);
        console.log('[API /calling] Payload:', JSON.stringify(payload));
        console.log('[API /calling] Using API Key for auth');

        const response = await fetch(callUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': api_key,  // User's API key for billing/transcripts
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
            return NextResponse.json({ error: errorMessage }, { status: response.status });
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
