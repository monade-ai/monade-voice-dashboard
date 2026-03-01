/**
 * Monade Dashboard Configuration
 * All values are read from environment variables (set in Vercel dashboard).
 */

export const CONFIG = {
  MONADE_API: {
    BASE_URL: process.env.NEXT_PUBLIC_MONADE_API_BASE_URL || 'https://service.monade.ai/db_services',
  },

  VOICE_AGENTS: {
    BASE_URL: process.env.NEXT_PUBLIC_VOICE_AGENTS_URL || 'https://service.monade.ai/voice_agents',
  },

  TRUNKS_SERVICE: {
    BASE_URL: process.env.NEXT_PUBLIC_TRUNKS_SERVICE_URL || 'https://service.monade.ai/trunks',
  },

  SESSION_MANAGER: {
    BASE_URL: process.env.NEXT_PUBLIC_SESSION_MANAGER_URL || 'https://service.monade.ai/session-manager',
  },
};

// Convenience exports used by hooks and contexts
export const MONADE_API_BASE = CONFIG.MONADE_API.BASE_URL;
export const TRUNKS_SERVICE_URL = CONFIG.TRUNKS_SERVICE.BASE_URL;
export const SESSION_MANAGER_URL = CONFIG.SESSION_MANAGER.BASE_URL;
