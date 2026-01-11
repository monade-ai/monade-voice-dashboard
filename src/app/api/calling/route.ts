import { NextRequest, NextResponse } from 'next/server';

// Trunks API for routing calls through correct provider
const TRUNKS_API_URL = 'http://35.200.254.189/trunks';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            phone_number,      // Target phone number to call
            callee_info,       // Metadata about the callee
            assistant_id,      // Assistant ID
            assistant_name,    // Assistant name (for Trunks API script selection)
            from_number        // The trunk phone number selected in UI (e.g. +13157918262)
        } = body;

        console.log('[API /calling] Received request:', { phone_number, assistant_id, assistant_name, from_number, callee_info });

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

        // Format target phone number
        let formattedPhone = phone_number.trim();
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        if (formattedPhone.length === 11 && formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone.substring(1);
        }

        // If from_number is provided, find the trunk for that number
        let trunkName = null;
        if (from_number) {
            try {
                console.log('[API /calling] Looking up trunk for number:', from_number);
                const trunksResponse = await fetch(`${TRUNKS_API_URL}/trunks`);
                if (trunksResponse.ok) {
                    const trunksData = await trunksResponse.json();
                    const trunks = trunksData.trunks || trunksData || [];

                    // Find trunk that contains this phone number
                    for (const trunk of trunks) {
                        if (trunk.numbers && trunk.numbers.includes(from_number)) {
                            trunkName = trunk.name;
                            console.log('[API /calling] Found trunk:', trunkName, 'for number:', from_number);
                            break;
                        }
                    }
                }
            } catch (err) {
                console.error('[API /calling] Error looking up trunk:', err);
            }
        }

        // Route through Trunks API if we have a trunk
        if (trunkName) {
            console.log('[API /calling] Using Trunks API with trunk:', trunkName);

            const callUrl = `${TRUNKS_API_URL}/calls`;
            const payload = {
                phone_number: formattedPhone,
                trunk_name: trunkName,
                assistant_id: assistant_id, // Include ID for script lookup in backend
                assistant_name: assistant_name || assistant_id,
                metadata: callee_info || {},
            };

            console.log('[API /calling] Calling Trunks API:', callUrl);
            console.log('[API /calling] Payload:', JSON.stringify(payload));

            const response = await fetch(callUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseText = await response.text();
            console.log('[API /calling] Trunks API response:', response.status, responseText);

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
        }

        // Fallback to Voice Agents API if no trunk found
        console.log('[API /calling] No trunk found, using fallback Voice Agents API');
        const VOICE_AGENTS_URL = 'http://35.200.254.189/voice_agents';
        const API_KEY = 'monade_d8325992-cf93-4cdd-9c54-34ca18d72441';

        const callUrl = `${VOICE_AGENTS_URL}/outbound-call/${encodeURIComponent(formattedPhone)}`;
        const payload = {
            assistant_id,
            metadata: callee_info || {},
        };

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
