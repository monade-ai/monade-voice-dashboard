import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Exotel API Route] Incoming request body:', body);

    // Validate required fields
    if (!body.phone_number || !body.callback_url) {
      console.error('[Exotel API Route] Missing required fields:', { 
        phone_number: !!body.phone_number, 
        callback_url: !!body.callback_url 
      });
      return NextResponse.json(
        { error: 'Missing required fields: phone_number and callback_url' },
        { status: 400 }
      );
    }

    // Read secrets from environment variables
    const apiKey = process.env.EXOTEL_API_KEY;
    const functionsKey = process.env.EXOTEL_FUNCTIONS_KEY;

    if (!apiKey || !functionsKey) {
      console.error('[Exotel API Route] Missing API credentials in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Masked for logging
    const maskedApiKey = apiKey.slice(0, 4) + '****' + apiKey.slice(-2);
    const maskedFunctionsKey = functionsKey.slice(0, 4) + '****' + functionsKey.slice(-2);

    console.log('[Exotel API Route] Using Exotel API endpoint');
    console.log('[Exotel API Route] Sending headers:', {
      'Content-Type': 'application/json',
      'X-API-Key': maskedApiKey,
      'x-functions-key': maskedFunctionsKey,
    });

    // Use environment variable for API URL
    const apiUrl = process.env.EXOTEL_API_URL || 'https://monade-outbound-exotel-fjgsgmcrftfeexeg.southindia-01.azurewebsites.net/api/call';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || '',
        'x-functions-key': functionsKey || '',
      },
      body: JSON.stringify(body),
    });

    // Log Exotel response status and body
    console.log('[Exotel API Route] Exotel response status:', response.status);
    let responseBody: string;
    try {
      responseBody = await response.clone().text();
      console.log('[Exotel API Route] Exotel response body:', responseBody);
    } catch (e) {
      console.warn('[Exotel API Route] Could not read Exotel response body:', e);
    }

    if (!response.ok) {
      console.error('[Exotel API Route] Exotel API call failed with status:', response.status);
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
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Exotel API Route] Call initiated successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Exotel API Route] Error in Exotel API route:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to initiate call';
    let statusCode = 500;

    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to phone service';
      statusCode = 503;
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Invalid response from phone service';
      statusCode = 502;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode },
    );
  }
}
