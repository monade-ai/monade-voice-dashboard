import { NextResponse } from 'next/server';
import { createLiveKitDispatch } from '@/lib/services/livekit-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[LiveKit Dispatch API Route] Incoming request body:', body);
    
    // Log environment variables for debugging
    console.log('[LiveKit Dispatch API Route] Environment variables:', {
      LIVEKIT_URL: process.env.LIVEKIT_URL,
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? 'SET' : 'NOT SET',
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? 'SET' : 'NOT SET'
    });

    // Validate required fields
    if (!body.roomName || !body.agentName) {
      console.error('[LiveKit Dispatch API Route] Missing required fields:', { 
        roomName: !!body.roomName, 
        agentName: !!body.agentName 
      });
      return NextResponse.json(
        { error: 'Missing required fields: roomName and agentName' },
        { status: 400 }
      );
    }

    // Create LiveKit dispatch
    const result = await createLiveKitDispatch({
      roomName: body.roomName,
      agentName: body.agentName,
      calleeInfo: body.calleeInfo || {},
      assistantId: body.assistantId
    });

    console.log('[LiveKit Dispatch API Route] Dispatch created successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[LiveKit Dispatch API Route] Error in LiveKit dispatch API route:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to create LiveKit dispatch';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for specific error types
      if (errorMessage.includes('configuration is missing')) {
        statusCode = 500;
      } else if (errorMessage.includes('required')) {
        statusCode = 400;
      } else if (errorMessage.includes('connect') || errorMessage.includes('fetch failed') || errorMessage.includes('ETIMEDOUT')) {
        statusCode = 503;
        errorMessage = 'Unable to connect to LiveKit service. Please check your network connection and LiveKit configuration.';
      }
    }

    // Log the error response we're sending back to the frontend
    console.log('[LiveKit Dispatch API Route] Sending error response back to frontend:', { status: statusCode, error: errorMessage });
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode },
    );
  }
}