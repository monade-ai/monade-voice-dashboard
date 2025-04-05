interface ExotelCallParams {
  phone_number: string;
  callback_url: string;
}

const EXOTEL_API_URL = '/api/exotel/call';
const EXOTEL_API_KEY = 'Kj8d6c8842b54e88378066cdc54133693';
const EXOTEL_FUNCTIONS_KEY = 'woImAXBkyOY9QjIFRufHf64l86fbnOsMH1CHXG6C2TqQAzFuKiexNA==';

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