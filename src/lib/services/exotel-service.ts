interface ExotelCallParams {
  phone_number: string;
  callback_url: string;
}

export async function initiateExotelCall(params: ExotelCallParams): Promise<Response> {
  console.log('[ExotelService] initiateExotelCall called with params:', params);
  try {
    const response = await fetch('/api/exotel/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log('[ExotelService] Exotel API response:', response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ExotelService] Failed to initiate call. Status:', response.status, 'Error:', errorText);
      throw new Error('Failed to initiate call');
    }

    return response;
  } catch (err) {
    console.error('[ExotelService] Exception in initiateExotelCall:', err);
    throw err;
  }
}
