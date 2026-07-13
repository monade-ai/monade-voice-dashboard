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

  // Self-hosted LiveKit control plane (used when the "Self-hosted" toggle is on)
  VOICE_AGENTS_SELFHOST: {
    BASE_URL: process.env.NEXT_PUBLIC_VOICE_AGENTS_SELFHOST_URL || 'https://service.monade.ai/voice_agents_selfhost',
  },

  TRUNKS_SERVICE: {
    BASE_URL: process.env.NEXT_PUBLIC_TRUNKS_SERVICE_URL || 'https://service.monade.ai/trunks',
  },

  SESSION_MANAGER: {
    BASE_URL: process.env.NEXT_PUBLIC_SESSION_MANAGER_URL || 'https://service.monade.ai/session-manager',
  },

  LIVEKIT: {
    AGENT_NAME: process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME || 'voice-agent',
  },
};

// Convenience exports used by hooks and contexts
export const MONADE_API_BASE = CONFIG.MONADE_API.BASE_URL;
export const VOICE_AGENTS_BASE = CONFIG.VOICE_AGENTS.BASE_URL;
export const VOICE_AGENTS_SELFHOST_BASE = CONFIG.VOICE_AGENTS_SELFHOST.BASE_URL;
export const TRUNKS_SERVICE_URL = CONFIG.TRUNKS_SERVICE.BASE_URL;
export const SESSION_MANAGER_URL = CONFIG.SESSION_MANAGER.BASE_URL;
export const LIVEKIT_AGENT_NAME = CONFIG.LIVEKIT.AGENT_NAME;
