import { fetchJson } from '@/lib/http';

interface ExotelCallParams {
  phone_number: string;
  callback_url: string;
}

export async function initiateExotelCall(params: ExotelCallParams): Promise<unknown> {
  console.log('[ExotelService] initiateExotelCall called with params:', params);
  console.log('[ExotelService] SENDING POST to /api/exotel/call with body:', JSON.stringify(params));
  console.log('[ExotelService] About to call fetch for /api/exotel/call');

  return fetchJson('/api/exotel/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    retry: { retries: 0 },
  });
}
