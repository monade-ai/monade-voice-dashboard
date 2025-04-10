interface ExotelCallParams {
  phone_number: string;
  callback_url: string;
}

const EXOTEL_API_URL = process.env.EXOTEL_API_URL;
const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_FUNCTIONS_KEY = process.env.EXOTEL_FUNCTIONS_KEY;

export async function initiateExotelCall(params: ExotelCallParams): Promise<Response> {
  const response = await fetch(EXOTEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': EXOTEL_API_KEY,
      'x-functions-key': EXOTEL_FUNCTIONS_KEY
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Failed to initiate call');
  }

  return response;
}