import { supabase } from './supabaseClient';

export const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

/**
 * Returns the current Supabase access token, or null if not authenticated.
 */
/**
 * Returns the current Supabase access token, or null if not authenticated.
 * Enhanced with detailed logging for debugging session issues.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getSession();
  console.log('[getAccessToken] Supabase session data:', data);
  console.log('[getAccessToken] Supabase session error:', error);

  if (error) {
    console.warn('[getAccessToken] Error fetching session:', error);
    return null;
  }
  if (!data.session) {
    console.warn('[getAccessToken] No session found. User may not be authenticated or session may have expired.');
    // For browser: check if session exists in localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(window.localStorage).filter(k => k.startsWith('sb-'));
      console.warn('[getAccessToken] Supabase-related localStorage keys:', keys);
      if (keys.length === 0) {
        console.warn('[getAccessToken] No Supabase session found in localStorage.');
      }
    }
    return null;
  }
  if (!data.session.access_token) {
    console.warn('[getAccessToken] Session found but access_token is missing:', data.session);
    return null;
  }
  return data.session.access_token;
};
