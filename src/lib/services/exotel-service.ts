interface ExotelCallParams {
  phone_number: string;
  callback_url: string;
}

export async function initiateExotelCall(params: ExotelCallParams): Promise<Response> {
  const response = await fetch('/api/exotel/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Failed to initiate call');
  }

  return response;
}