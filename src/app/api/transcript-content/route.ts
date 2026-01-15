import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route to fetch transcript content from GCS
 * This avoids CORS issues when fetching from browser
 */
export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url || !url.startsWith('https://storage.googleapis.com/')) {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        console.log('[Transcript Proxy] Fetching:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/plain',
            },
        });

        if (!response.ok) {
            console.error('[Transcript Proxy] Failed:', response.status);
            return NextResponse.json(
                { error: `Failed to fetch transcript: ${response.status}` },
                { status: response.status }
            );
        }

        const content = await response.text();
        console.log('[Transcript Proxy] Content length:', content.length);

        // Parse JSONL and extract conversation
        const lines = content.trim().split('\n');
        const messages: string[] = [];

        for (const line of lines) {
            try {
                const entry = JSON.parse(line);

                // Skip metadata lines
                if (entry.metadata) continue;

                const sender = entry.sender || entry.role || '';
                let text = '';

                // Handle text field (can be string, array, or object)
                if (entry.text !== undefined) {
                    if (typeof entry.text === 'string') {
                        text = entry.text;
                    } else if (Array.isArray(entry.text)) {
                        text = entry.text.join(' ');
                    } else if (typeof entry.text === 'object' && entry.text !== null) {
                        // Handle object with content property
                        text = entry.text.content || entry.text.text || JSON.stringify(entry.text);
                    }
                } else if (entry.content !== undefined) {
                    if (typeof entry.content === 'string') {
                        text = entry.content;
                    } else if (Array.isArray(entry.content)) {
                        text = entry.content.join(' ');
                    } else if (typeof entry.content === 'object' && entry.content !== null) {
                        text = entry.content.text || JSON.stringify(entry.content);
                    }
                }

                if (sender && text && text.trim()) {
                    const formattedSender = sender.charAt(0).toUpperCase() + sender.slice(1);
                    messages.push(`${formattedSender}: ${text.trim()}`);
                }
            } catch (e) {
                console.warn('[Transcript Proxy] Failed to parse line:', line.substring(0, 100));
            }
        }

        console.log('[Transcript Proxy] Parsed messages:', messages.length);

        return NextResponse.json({
            success: true,
            transcript: messages.join('\n'),
            messageCount: messages.length,
            raw: content
        });

    } catch (error) {
        console.error('[Transcript Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transcript' },
            { status: 500 }
        );
    }
}
