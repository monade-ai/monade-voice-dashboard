'use client';

/**
 * TEMPORARY — Haiku shadow analytics (A/B evaluation).
 *
 * Every post-processed call is analysed twice: by Gemini (the live, authoritative
 * result that drives webhooks, campaigns and billing) and by Claude Haiku on
 * Bedrock (a shadow result stored only for QA comparison). This hook reads the
 * shadow so the AI Intelligence pane can show it next to the live result.
 *
 * This is an experiment, not a product surface. It exists to answer "is Haiku
 * good enough to replace Gemini". When that question is settled, delete this
 * file, `ShadowModelToggle`, and the `shadowSource` wiring in the transcript
 * viewer — nothing else depends on any of it.
 *
 * Two things about the backend shape the UI here:
 *
 *  - The shadow ships disabled (`HAIKU_SHADOW_ENABLED=false`) pending Bedrock
 *    quota, so `shadow_status: "missing"` is the expected response, not an error.
 *  - Calls processed before the feature was switched on will never have shadow
 *    data. A null shadow is normal and must not render as a failure.
 */

import { useCallback, useEffect, useState } from 'react';

import { MONADE_API_BASE } from '@/config';
import { ApiError, fetchJson } from '@/lib/http';

import type { CallAnalytics } from './use-analytics';

export type ShadowStatus = 'ok' | 'error' | 'missing';

export interface HaikuShadowComparison {
  verdict_match?: boolean;
  call_quality_match?: boolean;
  call_status_match?: boolean;
  voicemail_match?: boolean;
  /** Null when either side produced no numeric score. Positive = Haiku more confident. */
  confidence_delta?: number | null;
  key_discoveries_matched?: number;
  key_discoveries_total?: number;
  /** `key_discoveries` keys the two models disagreed on. */
  mismatched_fields?: string[];
  gemini_verdict?: string;
  haiku_verdict?: string;
  gemini_model?: string;
}

export interface HaikuShadowError {
  type?: string;
  message?: string;
  /** `bedrock_call` (API failed), `parse` (unparseable JSON), `response` (model declined). */
  stage?: 'bedrock_call' | 'parse' | 'response' | string;
}

export interface HaikuShadowResult {
  schema_version?: number;
  provider?: string;
  model?: string;
  region?: string;
  /** Deliberately the same shape as the live analytics blob, so one renderer serves both. */
  analysis: CallAnalytics | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    /** Estimated from configured per-token rates — not billing truth. */
    estimated_cost_usd?: number;
  };
  latency_ms?: number;
  comparison?: HaikuShadowComparison;
  error?: HaikuShadowError | null;
  created_at?: string;
}

export interface HaikuShadowResponse {
  call_id: string;
  user_uid?: string;
  campaign_id?: string | null;
  phone_number?: string;
  transcript_url?: string;
  post_processing_template_id?: string | null;
  created_at?: string;
  updated_at?: string;
  /** The live analytics blob — identical to `analytics` on GET /api/analytics/:call_id. */
  gemini: CallAnalytics | null;
  haiku: HaikuShadowResult | null;
  shadow_status: ShadowStatus;
  comparison?: HaikuShadowComparison;
}

export function useHaikuShadow() {
  const [shadow, setShadow] = useState<HaikuShadowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShadow = useCallback(async (callId: string) => {
    if (!callId) return null;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<HaikuShadowResponse>(
        `${MONADE_API_BASE}/api/analytics/${encodeURIComponent(callId)}/haiku-shadow`,
      );
      // Older rows and load-shed runs come back without the field at all.
      const normalized: HaikuShadowResponse = {
        ...data,
        shadow_status: data?.shadow_status ?? 'missing',
      };
      setShadow(normalized);

      return normalized;
    } catch (err) {
      // A 404 means no call_analytics row exists for this call at all. That is
      // "nothing to compare", not a broken shadow, so it takes the same quiet
      // path as `missing` rather than showing an error to the user.
      if (err instanceof ApiError && err.status === 404) {
        setShadow(null);

        return null;
      }

      console.warn('[useHaikuShadow] Failed to fetch shadow analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shadow analytics');
      setShadow(null);

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { shadow, loading, error, fetchShadow };
}

/**
 * Fetches the shadow for a call, but only once `enabled` turns true.
 *
 * The comparison is a QA affordance behind a toggle, so the request is deferred
 * until someone actually asks for it. Fetching eagerly would add a request to
 * every transcript open for a feature that is currently disabled server-side and
 * returns `missing` every time.
 */
export function useHaikuShadowForCall(callId: string, enabled: boolean) {
  const { shadow, loading, error, fetchShadow } = useHaikuShadow();
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    setHasFetched(false);
  }, [callId]);

  useEffect(() => {
    if (!enabled || hasFetched || !callId) return;

    setHasFetched(true);
    fetchShadow(callId).catch(() => undefined);
  }, [callId, enabled, fetchShadow, hasFetched]);

  return { shadow, loading: loading || (enabled && !hasFetched), error };
}
