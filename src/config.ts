/**
 * Monade Dashboard Configuration
 * All API endpoints and keys are hardcoded here for Vercel deployment
 * 
 * NOTE: This file contains sensitive keys. In production, these should
 * be moved to environment variables configured in Vercel dashboard.
 */

export const CONFIG = {
  // Monade Voice Config Server API (db_services)
  // On client-side, use proxy; on server-side, use direct URL
  MONADE_API: {
    // For client-side fetch calls, use the proxy to avoid mixed content
    BASE_URL: typeof window !== 'undefined' ? '/api/proxy' : 'http://35.200.254.189/db_services',
    // Direct URL for server-side calls
    DIRECT_URL: 'http://35.200.254.189/db_services',
    API_KEY: 'monade_d8325992-cf93-4cdd-9c54-34ca18d72441',
    DEFAULT_USER_UID: 'b08d1d4d-a47d-414b-9360-80264388793f',
  },

  // Voice Agents API (for outbound calling)
  VOICE_AGENTS: {
    BASE_URL: 'http://35.200.254.189/voice_agents',
    API_KEY: 'monade_d8325992-cf93-4cdd-9c54-34ca18d72441',
  },

  // LiveKit Configuration
  LIVEKIT: {
    API_KEY: 'APIm2HcRedb9xwE',
    API_SECRET: 'SEKTy0zr2cFT9Hp1TSeXuF9HQVI2PgvKqXLCzG9zlGR',
    URL: 'wss://streaming-stt-ni8xiohq.livekit.cloud',
    AGENT_NAME: 'voice-agent',
  },

  // Supabase Configuration
  SUPABASE: {
    URL: 'https://jmuzbxveurbpmlgawcvq.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdXpieHZldXJicG1sZ2F3Y3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDIxMTgsImV4cCI6MjA2MjgxODExOH0.9GtSBBCwK3dqPPRIcqAOdHOlVVwU7rYFWOz1ejO_KaI',
  },

  // Provider
  PROVIDER: 'vobiz.ai',
} as const;

// Export individual configs for convenience
export const MONADE_API_BASE = CONFIG.MONADE_API.BASE_URL;
export const MONADE_API_KEY = CONFIG.MONADE_API.API_KEY;
export const DEFAULT_USER_UID = CONFIG.MONADE_API.DEFAULT_USER_UID;
export const VOICE_AGENTS_URL = CONFIG.VOICE_AGENTS.BASE_URL;
export const VOICE_AGENTS_API_KEY = CONFIG.VOICE_AGENTS.API_KEY;
export const SUPABASE_URL = CONFIG.SUPABASE.URL;
export const SUPABASE_ANON_KEY = CONFIG.SUPABASE.ANON_KEY;
