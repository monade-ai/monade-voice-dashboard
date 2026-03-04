/** @jest-environment node */

import { proxy } from './proxy';

describe('proxy auth gate', () => {
  test('redirects root to /login', async () => {
    const nextUrl = new URL('https://dashboard.monade.ai/');
    const request: any = {
      nextUrl: Object.assign(nextUrl, { clone: () => new URL(nextUrl.toString()) }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    };

    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('allows public login route', async () => {
    const nextUrl = new URL('https://dashboard.monade.ai/login');
    const request: any = {
      nextUrl: Object.assign(nextUrl, { clone: () => new URL(nextUrl.toString()) }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    };

    const response = await proxy(request);
    expect(response.status).toBe(200);
  });

  test('redirects protected route when no session cookie exists', async () => {
    const nextUrl = new URL('https://dashboard.monade.ai/dashboard');
    const request: any = {
      nextUrl: Object.assign(nextUrl, { clone: () => new URL(nextUrl.toString()) }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    };

    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });
});
