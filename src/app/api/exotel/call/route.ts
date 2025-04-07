import { NextResponse } from 'next/server';

const EXOTEL_API_URL = process.env.EXOTEL_API_URL;
const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_FUNCTIONS_KEY = process.env.EXOTEL_FUNCTIONS_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(EXOTEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': EXOTEL_API_KEY,
        'x-functions-key': EXOTEL_FUNCTIONS_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('Failed to initiate call');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Exotel API route:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    );
  }
}