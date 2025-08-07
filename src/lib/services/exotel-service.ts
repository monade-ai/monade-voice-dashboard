interface ExotelCallParams {
  phone_number: string;
  callback_url: string;
}

export async function initiateExotelCall(params: ExotelCallParams): Promise<Response> {
  console.log('[ExotelService] initiateExotelCall called with params:', params);
  try {
    // Log the request body before sending
    console.log('[ExotelService] SENDING POST to /api/exotel/call with body:', JSON.stringify(params));
    // Add explicit log before fetch
    console.log('[ExotelService] About to call fetch for /api/exotel/call');
    const response = await fetch('/api/exotel/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    // Add explicit log after fetch
    console.log('[ExotelService] Fetch to /api/exotel/call completed. Response:', response);

    // Log the raw response object
    console.log('[ExotelService] Exotel API raw response:', response);

    // Try to log the response body as text (non-blocking)
    try {
      const clone = response.clone();
      const text = await clone.text();
      console.log('[ExotelService] Exotel API response body:', text);
    } catch (e) {
      console.warn('[ExotelService] Could not read response body:', e);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ExotelService] Failed to initiate call. Status:', response.status, 'Error:', errorText);
      
      // Try to parse error response for better error messages
      let errorMessage = 'Failed to initiate call';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If we can't parse JSON, use a generic message
        if (response.status === 400) {
          errorMessage = 'Invalid phone number or request data';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'Authentication failed';
        } else if (response.status >= 500) {
          errorMessage = 'Phone service temporarily unavailable';
        }
      }
      
      throw new Error(errorMessage);
    }

    return response;
  } catch (err) {
    console.error('[ExotelService] Exception in initiateExotelCall:', err);
    throw err;
  }
}
