// lib/services/new-calling-service.ts

interface CalleeInfo {
  [key: string]: string;
}

interface NewCallingParams {
  phone_number: string;
  callee_info: CalleeInfo;
  assistant_id: string;
  trunk_name: string; // Selected trunk: 'twilio' or 'vobiz'
  api_key: string; // User's API key for billing/transcripts
}

export async function initiateNewCall(params: NewCallingParams): Promise<Response> {
  console.log('[NewCallingService] initiateNewCall called with params:', {
    ...params,
    api_key: params.api_key ? `${params.api_key.substring(0, 20)}...` : 'NOT PROVIDED',
  });

  if (!params.api_key) {
    throw new Error('API key is required for billing. Please ensure you have an API key configured.');
  }

  if (!params.trunk_name) {
    throw new Error('Please select a trunk (Twilio or Vobiz) to make the call.');
  }

  try {
    // Prepare the payload for our proxy API
    const payload = {
      phone_number: params.phone_number,
      callee_info: params.callee_info || {},
      assistant_id: params.assistant_id,
      trunk_name: params.trunk_name, // 'twilio' or 'vobiz'
      api_key: params.api_key, // User's API key for billing
    };

    console.log('[NewCallingService] SENDING POST to /api/calling with body:', JSON.stringify({
      ...payload,
      api_key: `${payload.api_key.substring(0, 20)}...`,
    }));

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for calling

    const response = await fetch('/api/calling', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[NewCallingService] Fetch completed. Response status:', response.status);

    // Clone the response to read the body without consuming it
    const responseClone = response.clone();
    const responseBody = await responseClone.text();
    console.log('[NewCallingService] Response body:', responseBody);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBody);
      } catch {
        errorData = { error: responseBody || 'Unknown error' };
      }
      console.error('[NewCallingService] Failed to initiate call. Status:', response.status, 'Error:', errorData);

      let errorMessage = 'Failed to initiate call';
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (response.status === 400) {
        errorMessage = 'Invalid phone number or request data';
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Authentication failed. Please check your API key.';
      } else if (response.status >= 500) {
        errorMessage = 'Phone service temporarily unavailable';
      }

      throw new Error(errorMessage);
    }

    return response;
  } catch (err) {
    console.error('[NewCallingService] Exception in initiateNewCall:', err);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to initiate call';

    if (err instanceof DOMException && err.name === 'AbortError') {
      errorMessage = 'Request timeout. The calling service is not responding.';
    } else if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMessage = 'Unable to connect to calling service. Please check your network connection.';
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    throw new Error(errorMessage);
  }
}
