import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to fetch transcript files from GCS
 * This avoids CORS issues when fetching from external storage
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 },
      );
    }

    // Validate URL is from expected GCS domain
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.includes('storage.googleapis.com') && !parsedUrl.hostname.includes('storage.cloud.google.com')) {
      return NextResponse.json(
        { error: 'Invalid transcript URL' },
        { status: 400 },
      );
    }

    // Fetch the transcript
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch transcript: ${response.status}` },
        { status: response.status },
      );
    }

    const text = await response.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);

    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 },
    );
  }
}
