import {
  buildForwardHeaders,
  hasBetterAuthSessionCookieFromRequest,
} from './server-auth';

describe('server-auth helpers', () => {
  test('detects Better Auth session cookies', () => {
    const cookies = {
      get: (name: string) => {
        if (name === 'better-auth.session_token') return { value: 'token' };

        return undefined;
      },
    };

    expect(hasBetterAuthSessionCookieFromRequest(cookies)).toBe(true);
  });

  test('forwards cookie and authorization headers', () => {
    const headers = new Headers({
      cookie: 'better-auth.session_token=abc',
      authorization: 'Bearer user-token',
      'content-type': 'application/json',
      accept: 'application/json',
    });

    const forwarded = buildForwardHeaders(headers, true);
    expect(forwarded.get('Cookie')).toBe('better-auth.session_token=abc');
    expect(forwarded.get('Authorization')).toBe('Bearer user-token');
    expect(forwarded.get('Content-Type')).toBe('application/json');
    expect(forwarded.get('Accept')).toBe('application/json');
  });

  test('does not inject service token when a cookie is present', () => {
    const headers = new Headers({
      cookie: 'better-auth.session_token=abc',
    });

    const forwarded = buildForwardHeaders(headers, true);
    expect(forwarded.get('Authorization')).toBeNull();
    expect(forwarded.get('X-API-Key')).toBeNull();
  });
});
