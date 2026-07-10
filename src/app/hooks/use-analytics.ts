'use client';

import { useState, useCallback } from 'react';

import { ApiError, fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';
import {
  clearLocalCacheByResource,
  createScopedCacheKey,
  getCurrentOrganizationId,
  readLocalCache,
  writeLocalCache,
} from '@/lib/utils/client-cache';

import { useMonadeUser } from './use-monade-user';

const CALL_ANALYTICS_CACHE_TTL_MS = 5 * 60_000;
const CALL_ANALYTICS_MISS_CACHE_TTL_MS = 15_000;
const USER_ANALYTICS_CACHE_TTL_MS = 60_000;
const CALL_ANALYTICS_RESOURCE = 'call-analytics';
const USER_ANALYTICS_RESOURCE = 'user-analytics';

interface CachedCallAnalytics {
  data: CallAnalytics | null;
  cachedAt: number;
}

interface CachedUserAnalytics {
  data: CallAnalytics[];
  cachedAt: number;
}

const callAnalyticsCache = new Map<string, CachedCallAnalytics>();
const callAnalyticsInFlight = new Map<string, Promise<CallAnalytics | null>>();
const userAnalyticsCache = new Map<string, CachedUserAnalytics>();
const userAnalyticsInFlight = new Map<string, Promise<CallAnalytics[]>>();

type FetchAllOptions = boolean | {
  forceRefresh?: boolean;
  expectedCallIds?: string[];
};

function analyticsCacheKey(userUid: string, resource: string, params?: unknown) {
  return createScopedCacheKey(
    { userUid, organizationId: getCurrentOrganizationId() },
    resource,
    params,
  );
}

function callCacheTtl(data: CallAnalytics | null) {
  return data ? CALL_ANALYTICS_CACHE_TTL_MS : CALL_ANALYTICS_MISS_CACHE_TTL_MS;
}

function normalizeFetchAllOptions(options: FetchAllOptions = false) {
  if (typeof options === 'boolean') {
    return { forceRefresh: options, expectedCallIds: undefined };
  }

  return {
    forceRefresh: options.forceRefresh ?? false,
    expectedCallIds: options.expectedCallIds,
  };
}

function cacheCoversExpectedCalls(data: CallAnalytics[], expectedCallIds?: string[]) {
  if (!expectedCallIds?.length) return true;

  const cachedCallIds = new Set(data.map((item) => item.call_id).filter(Boolean));

  return expectedCallIds.every((callId) => cachedCallIds.has(callId));
}

export function invalidateAnalyticsCaches(callId?: string) {
  if (callId) {
    callAnalyticsCache.clear();
    callAnalyticsInFlight.clear();
  }

  userAnalyticsCache.clear();
  userAnalyticsInFlight.clear();
  clearLocalCacheByResource(CALL_ANALYTICS_RESOURCE);
  clearLocalCacheByResource(USER_ANALYTICS_RESOURCE);
}

// Analytics data structure matching actual API response
export interface BillingData {
  assistant_id?: string;
  credits_used?: number;
  cost_per_minute?: number;
  recording_enabled?: boolean;
  recording_surcharge_total?: number;
  call_direction?: 'inbound' | 'outbound' | 'unknown' | string;
  settlement_status?: 'ok' | 'failed' | string;
}

export interface ProviderCallStatus {
  status: 'answered' | 'no_answer' | 'busy' | 'failed' | 'cancelled' | string;
  hangup_cause?: string | null;
  duration?: number | null;
  end_time?: string | null;
  direction: 'inbound' | 'outbound' | string;
  source: 'vobiz' | 'skipped' | string;
  fetched_at: string;
}

export interface RecordingMetadata {
  duration_ms?: number | null;
  from_number?: string | null;
  to_number?: string | null;
  recording_available_after_ms?: number | null;
  fetched_at?: string;
}

export interface CallAnalytics {
  id?: string;
  call_id: string;
  user_uid?: string;
  post_processing_template_id?: string | null;
  verdict: string; // e.g., "interested", "not_interested", "callback"
  confidence_score: number; // 0-100
  summary: string;
  key_discoveries: {
    service_type?: string;
    price_quoted?: string;
    customer_location?: string;
    customer_name?: string | null;
    customer_language?: string;
    objections_raised?: string[];
    next_steps?: string | null;
    duration_seconds?: number;
    [key: string]: string | string[] | number | null | undefined;
  };
  call_quality: string; // e.g., "high", "medium", "low", "abrupt_end"
  use_case: string;
  analysis_timestamp?: string;
  analysis_model?: string;
  transcript_url?: string;
  enhanced_transcript_url?: string | null;
  phone_number?: string;
  campaign_id?: string;
  created_at?: string;
  updated_at?: string;
  sip_call_id?: string;
  recording_url?: string | null;
  recording_duration_ms?: string | null;
  // Billing audit data (arrives ~3-4s after call ends)
  call_started_at?: string;
  call_ended_at?: string;
  duration_seconds?: number;
  billing_data?: BillingData | null;
  // Provider/CDR ground truth (filled async by sweeper, may stay null)
  provider_call_status?: ProviderCallStatus | null;
  call_status?: 'picked_up' | 'not_picked_up' | string | null;
  voicemail?: boolean | null;
  recording_metadata?: RecordingMetadata | null;
  analytics_history?: Array<Record<string, unknown>>;
}

// Hook to fetch analytics for a specific call
export function useCallAnalytics() {
  const { userUid } = useMonadeUser();
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByCallId = useCallback(async (callId: string, forceRefresh = false) => {
    if (!callId) return null;
    const scopedCallId = analyticsCacheKey(userUid ?? 'anonymous', CALL_ANALYTICS_RESOURCE, { callId });
    const localCacheKey = userUid
      ? analyticsCacheKey(userUid, CALL_ANALYTICS_RESOURCE, { callId })
      : null;

    if (!forceRefresh) {
      const cached = callAnalyticsCache.get(scopedCallId);
      if (cached && Date.now() - cached.cachedAt < callCacheTtl(cached.data)) {
        setAnalytics(cached.data);
        setError(null);
        setLoading(false);

        return cached.data;
      }

      const persisted = localCacheKey ? readLocalCache<CallAnalytics | null>(localCacheKey) : null;
      if (persisted && persisted.value) {
        callAnalyticsCache.set(scopedCallId, { data: persisted.value, cachedAt: persisted.cachedAt });
        setAnalytics(persisted.value);
        setError(null);
        setLoading(false);

        return persisted.value;
      }
    }

    if (!forceRefresh) {
      const inFlight = callAnalyticsInFlight.get(scopedCallId);
      if (inFlight) {
        const result = await inFlight;
        setAnalytics(result);
        setError(null);
        setLoading(false);

        return result;
      }
    }

    const request = (async () => {
      try {
        const data = await fetchJson<any>(`${MONADE_API_BASE}/api/analytics/${callId}`);
        const analyticsData = (data.analytics || data) as CallAnalytics;
        const cachedAt = Date.now();
        callAnalyticsCache.set(scopedCallId, { data: analyticsData, cachedAt });
        if (localCacheKey) writeLocalCache(localCacheKey, analyticsData, CALL_ANALYTICS_CACHE_TTL_MS);

        return analyticsData;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          const cachedAt = Date.now();
          callAnalyticsCache.set(scopedCallId, { data: null, cachedAt });

          return null;
        }
        throw err;
      } finally {
        callAnalyticsInFlight.delete(scopedCallId);
      }
    })();

    callAnalyticsInFlight.set(scopedCallId, request);

    try {
      setLoading(true);
      setError(null);
      const analyticsData = await request;
      setAnalytics(analyticsData);

      return analyticsData;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setAnalytics(null);

        return null;
      }
      console.warn('[useCallAnalytics] Failed to fetch call analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');

      return null;
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  return {
    analytics,
    loading,
    error,
    fetchByCallId,
  };
}

// Hook to fetch all analytics for the user
export function useUserAnalytics() {
  const { userUid } = useMonadeUser(); // Get logged-in user's ID
  const [analytics, setAnalytics] = useState<CallAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (options: FetchAllOptions = false) => {
    if (!userUid) {
      setAnalytics([]);

      return [];
    }
    const { forceRefresh, expectedCallIds } = normalizeFetchAllOptions(options);
    const scopedUserKey = analyticsCacheKey(userUid, USER_ANALYTICS_RESOURCE, { userUid });

    if (!forceRefresh) {
      const cached = userAnalyticsCache.get(scopedUserKey);
      if (
        cached
        && Date.now() - cached.cachedAt < USER_ANALYTICS_CACHE_TTL_MS
        && cacheCoversExpectedCalls(cached.data, expectedCallIds)
      ) {
        setAnalytics(cached.data);
        setError(null);
        setLoading(false);

        return cached.data;
      }

      const persisted = readLocalCache<CallAnalytics[]>(scopedUserKey);
      if (persisted && cacheCoversExpectedCalls(persisted.value, expectedCallIds)) {
        userAnalyticsCache.set(scopedUserKey, { data: persisted.value, cachedAt: persisted.cachedAt });
        setAnalytics(persisted.value);
        setError(null);
        setLoading(false);

        return persisted.value;
      }
    }

    if (!forceRefresh) {
      const inFlight = userAnalyticsInFlight.get(scopedUserKey);
      if (inFlight) {
        const result = await inFlight;
        setAnalytics(result);
        setError(null);
        setLoading(false);

        return result;
      }
    }

    const request = (async () => {
      try {
        const data = await fetchJson<any>(`${MONADE_API_BASE}/api/analytics?user_uid=${userUid}`);

        // Merge the inner analytics object with top-level call metadata.
        // IMPORTANT: keep this allowlist in sync with the backend doc
        // (docs/FRONTEND_CALL_DIRECTION_AND_BILLING_FIELDS.md).
        // Anything NOT listed here gets dropped — that's how billing_data /
        // provider_call_status / recording_metadata silently disappeared before.
        const mergeRecord = (item: any): CallAnalytics => ({
          ...item.analytics,
          id: item.id,
          call_id: item.call_id,
          user_uid: item.user_uid,
          post_processing_template_id: item.post_processing_template_id
            ?? item.analytics?.post_processing_template_id
            ?? item.analytics?.template_id
            ?? null,
          phone_number: item.phone_number,
          transcript_url: item.transcript_url,
          enhanced_transcript_url: item.enhanced_transcript_url,
          campaign_id: item.campaign_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          sip_call_id: item.sip_call_id,
          recording_url: item.recording_url,
          recording_duration_ms: item.recording_duration_ms,
          // Billing audit + CDR fields (per backend doc)
          call_started_at: item.call_started_at,
          call_ended_at: item.call_ended_at,
          duration_seconds: item.duration_seconds,
          billing_data: item.billing_data,
          provider_call_status: item.provider_call_status,
          call_status: item.call_status ?? item.analytics?.call_status ?? null,
          voicemail: item.voicemail ?? item.analytics?.voicemail ?? null,
          recording_metadata: item.recording_metadata,
        });

        let analyticsArray: CallAnalytics[] = [];
        if (Array.isArray(data)) {
          analyticsArray = data.map(item => (item.analytics ? mergeRecord(item) : item));
        } else if (data.analytics) {
          analyticsArray = Array.isArray(data.analytics)
            ? data.analytics.map((item: any) => (item.analytics ? mergeRecord(item) : item))
            : [data.analytics];
        }

        userAnalyticsCache.set(scopedUserKey, { data: analyticsArray, cachedAt: Date.now() });
        writeLocalCache(scopedUserKey, analyticsArray, USER_ANALYTICS_CACHE_TTL_MS);

        return analyticsArray;
      } finally {
        userAnalyticsInFlight.delete(scopedUserKey);
      }
    })();

    userAnalyticsInFlight.set(scopedUserKey, request);

    try {
      setLoading(true);
      setError(null);
      const analyticsArray = await request;
      setAnalytics(analyticsArray);

      return analyticsArray;
    } catch (err) {
      console.warn('[useUserAnalytics] Failed to fetch user analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      setAnalytics([]);

      return [];
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  return {
    analytics,
    loading,
    error,
    fetchAll,
  };
}

export default useCallAnalytics;
