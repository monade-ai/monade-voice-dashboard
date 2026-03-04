/** @jest-environment node */

import { POST } from './route';

const mockFetch = global.fetch as jest.Mock;

describe('/api/calling route', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request: any = {
      headers: new Headers(),
      method: 'POST',
      json: async () => ({
        phone_number: '+919876543210',
        assistant_id: 'assistant-1',
        trunk_name: 'vobiz',
      }),
    };

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('not authenticated');
  });

  test('returns 403 when body user_uid mismatches session user', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_uid: 'user-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request: any = {
      headers: new Headers({
        cookie: 'better-auth.session_token=abc',
      }),
      method: 'POST',
      json: async () => ({
        phone_number: '+919876543210',
        assistant_id: 'assistant-1',
        trunk_name: 'vobiz',
        user_uid: 'user-2',
      }),
    };

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('does not match');
  });

  test('initiates call with service token and authenticated user', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user_uid: 'user-1', email: 'a@b.com' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ call_id: 'call-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const request: any = {
      headers: new Headers({
        cookie: 'better-auth.session_token=abc',
      }),
      method: 'POST',
      json: async () => ({
        phone_number: '+919876543210',
        assistant_id: 'assistant-1',
        trunk_name: 'vobiz',
      }),
    };

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.call_id).toBe('call-1');

    const voiceCall = mockFetch.mock.calls[1];
    const options = voiceCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-service-token');
    expect(headers['X-API-Key']).toBe('test-service-token');
  });
});
