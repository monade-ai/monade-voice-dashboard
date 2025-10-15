import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Calling API Route] Incoming request body:', body);

    // Validate required fields
    if (!body.phone_number) {
      console.error('[Calling API Route] Missing required field: phone_number');
      return NextResponse.json(
        { error: 'Missing required field: phone_number' },
        { status: 400 }
      );
    }

    // Get the base URL from environment variables with fallback
    const baseUrl = process.env.NEXT_PUBLIC_CALLING_SERVICE_URL || 'http://34.47.175.17:8000';
    
    // Construct the full URL, ensuring no double slashes
    const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const formattedPhoneNumber = formatPhoneNumber(body.phone_number);
    const url = `${cleanBaseUrl}/outbound-call/${formattedPhoneNumber}`;
    
    console.log('[Calling API Route] Making call to URL:', url);
    
    // Prepare the payload
    const payload = {
      metadata: body.callee_info || {}
    };
    
    console.log('[Calling API Route] SENDING POST to', url, 'with body:', JSON.stringify(payload));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Log detailed calling service response
    console.log('[Calling API Route] Calling service response status:', response.status);
    console.log('[Calling API Route] Calling service response headers:', [...response.headers.entries()]);
    let responseBody: string;
    try {
      responseBody = await response.clone().text();
      console.log('[Calling API Route] Calling service response body:', responseBody);
    } catch (e) {
      console.warn('[Calling API Route] Could not read calling service response body:', e);
    }

    if (!response.ok) {
      console.error('[Calling API Route] Calling service call failed with status:', response.status);
      let errorMessage = 'Failed to initiate call';
      
      // Try to extract error message from response
      try {
        const errorData = await response.json();
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (e) {
        // If we can't parse JSON, use the text response
        if (responseBody) {
          errorMessage = responseBody;
        }
      }
      
      // Log the error response we're sending back to the frontend
      console.log('[Calling API Route] Sending error response back to frontend:', { status: response.status, error: errorMessage });
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Calling API Route] Call initiated successfully:', data);
    
    // Log the response we're sending back to the frontend
    console.log('[Calling API Route] Sending response back to frontend:', { status: 200, data });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Calling API Route] Error in calling API route:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to initiate call';
    let statusCode = 500;

    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to calling service';
      statusCode = 503;
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Invalid response from calling service';
      statusCode = 502;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Log the error response we're sending back to the frontend
    console.log('[Calling API Route] Sending error response back to frontend:', { status: statusCode, error: errorMessage });
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode },
    );
  }
}

function formatPhoneNumber(phoneNumber: string): string {
  // Format phone number to include +91 if needed
  let formattedPhoneNumber = phoneNumber;
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length >= 10 && !phoneNumber.startsWith('+')) {
    // Assuming Indian numbers if 10 digits
    if (cleaned.length === 10) {
      formattedPhoneNumber = `+91${cleaned}`;
    } else {
      formattedPhoneNumber = `+${cleaned}`;
    }
  }
  
  return formattedPhoneNumber;
}