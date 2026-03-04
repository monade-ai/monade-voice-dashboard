/** @jest-environment node */

import { GET } from '../[...path]/route';

const mockFetch = global.fetch as jest.Mock;

describe('/api/campaigns proxy route', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test('rejects user_uid mismatch', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_uid: 'user-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request: any = {
      nextUrl: new URL('https://dashboard.monade.ai/api/campaigns/campaigns?user_uid=user-2'),
      headers: new Headers({
        cookie: 'better-auth.session_token=abc',
      }),
      method: 'GET',
    };

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('User mismatch');
  });

  test('forwards authenticated campaign request', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user_uid: 'user-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const request: any = {
      nextUrl: new URL('https://dashboard.monade.ai/api/campaigns/campaigns'),
      headers: new Headers({
        cookie: 'better-auth.session_token=abc',
      }),
      method: 'GET',
    };

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ items: [] });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const downstreamCall = mockFetch.mock.calls[1];
    const options = downstreamCall[1] as RequestInit;
    const downstreamHeaders = options.headers as Record<string, string>;
    expect(downstreamHeaders.Authorization).toBe('Bearer test-service-token');
    expect(downstreamHeaders['X-User-Uid']).toBe('user-1');
  });
});
