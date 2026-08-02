'use client';

import { useAuth } from '@/contexts/auth-context';

/**
 * Per-user feature flags, granted from Control Tower.
 *
 * Flags ride along on /api/me, which AuthProvider already fetches app-wide and
 * refetches on window focus, so reading one costs nothing extra.
 *
 * These gate UI only. Anything that actually needs protecting is enforced
 * server-side — a flag being wrong should change what a user sees, never what
 * they are allowed to do.
 */
export const FEATURE_FLAGS = {
  /** CollegeVidya's multi-template follow-up sequence editor in WhatsApp Flows. */
  whatsappCadenceLadder: 'whatsapp_cadence_ladder',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { user } = useAuth();

  return Boolean(user?.features?.[flag]);
}
