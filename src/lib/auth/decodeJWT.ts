/**
 * Decodes a JWT and returns its payload as a JSON object.
 * Returns null if the token is invalid.
 */
export function decodeJWT(token: string): Record<string, any> | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    // Handle Unicode
    const jsonPayload = decodeURIComponent(
      decoded
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[decodeJWT] Failed to decode JWT:', e);

    return null;
  }
}

/**
 * Extracts the 'role' claim from a JWT, or null if not present.
 */
export function getRoleFromJWT(token: string): string | null {
  const payload = decodeJWT(token);
  if (!payload) return null;
  // Common places for role claim: 'role', 'app_metadata.role', 'custom:role'
  if (payload.role) return payload.role;
  if (payload['https://hasura.io/jwt/claims'] && payload['https://hasura.io/jwt/claims']['x-hasura-role']) {
    return payload['https://hasura.io/jwt/claims']['x-hasura-role'];
  }
  if (payload['app_metadata'] && payload['app_metadata'].role) {
    return payload['app_metadata'].role;
  }
  if (payload['custom:role']) return payload['custom:role'];

  return null;
}
