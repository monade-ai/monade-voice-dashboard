import { authClientManager } from './AuthClientManager';
import { configManager } from './ConfigManager';

// Initialize configuration validation
configManager.resolveConflicts();

export const getUser = async () => {
  const supabase = authClientManager.getComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

/**
 * Returns the current Supabase access token, or null if not authenticated.
 * Enhanced with detailed logging for debugging session issues.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const session = await authClientManager.getCurrentSession();
  console.log('[getAccessToken] Supabase session data:', session);

  if (!session) {
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
  if (!session.access_token) {
    console.warn('[getAccessToken] Session found but access_token is missing:', session);
    return null;
  }
  return session.access_token;
};
