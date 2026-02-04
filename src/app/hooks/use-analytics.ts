'use client';

import { useState, useCallback } from 'react';

import { ApiError, fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const ANALYTICS_CACHE_TTL_MS = 60_000;

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

// Analytics data structure matching actual API response
export interface CallAnalytics {
    id?: string;
    call_id: string;
    user_uid?: string;
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
        [key: string]: string | string[] | null | undefined;
    };
    call_quality: string; // e.g., "high", "medium", "low", "abrupt_end"
    use_case: string;
    analysis_timestamp?: string;
    analysis_model?: string;
    transcript_url?: string;
    phone_number?: string;
    campaign_id?: string;
    created_at?: string;
}

// Hook to fetch analytics for a specific call
export function useCallAnalytics() {
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByCallId = useCallback(async (callId: string, forceRefresh = false) => {
    if (!callId) return null;

    if (!forceRefresh) {
      const cached = callAnalyticsCache.get(callId);
      if (cached && Date.now() - cached.cachedAt < ANALYTICS_CACHE_TTL_MS) {
        setAnalytics(cached.data);
        setError(null);
        setLoading(false);

        return cached.data;
      }
    }

    if (!forceRefresh) {
      const inFlight = callAnalyticsInFlight.get(callId);
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
        const data = await fetchJson<any>(`/api/proxy/api/analytics/${callId}`);
        const analyticsData = (data.analytics || data) as CallAnalytics;
        callAnalyticsCache.set(callId, { data: analyticsData, cachedAt: Date.now() });

        return analyticsData;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          callAnalyticsCache.set(callId, { data: null, cachedAt: Date.now() });

          return null;
        }
        throw err;
      } finally {
        callAnalyticsInFlight.delete(callId);
      }
    })();

    callAnalyticsInFlight.set(callId, request);

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
  }, []);

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

  const fetchAll = useCallback(async (forceRefresh = false) => {
    if (!userUid) {
      setAnalytics([]);

      return [];
    }

    if (!forceRefresh) {
      const cached = userAnalyticsCache.get(userUid);
      if (cached && Date.now() - cached.cachedAt < ANALYTICS_CACHE_TTL_MS) {
        setAnalytics(cached.data);
        setError(null);
        setLoading(false);

        return cached.data;
      }
    }

    if (!forceRefresh) {
      const inFlight = userAnalyticsInFlight.get(userUid);
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
        const data = await fetchJson<any>(`/api/proxy/api/analytics?user_uid=${userUid}`);

        let analyticsArray: CallAnalytics[] = [];
        if (Array.isArray(data)) {
          analyticsArray = data.map(item => {
            if (item.analytics) {
              return {
                ...item.analytics,
                id: item.id,
                call_id: item.call_id,
                user_uid: item.user_uid,
                phone_number: item.phone_number,
                transcript_url: item.transcript_url,
                campaign_id: item.campaign_id,
                created_at: item.created_at,
                updated_at: item.updated_at,
              };
            }

            return item;
          });
        } else if (data.analytics) {
          analyticsArray = Array.isArray(data.analytics)
            ? data.analytics.map((item: any) => {
              if (item.analytics) {
                return {
                  ...item.analytics,
                  id: item.id,
                  call_id: item.call_id,
                  user_uid: item.user_uid,
                  phone_number: item.phone_number,
                  transcript_url: item.transcript_url,
                  campaign_id: item.campaign_id,
                  created_at: item.created_at,
                  updated_at: item.updated_at,
                };
              }

              return item;
            })
            : [data.analytics];
        }

        userAnalyticsCache.set(userUid, { data: analyticsArray, cachedAt: Date.now() });

        return analyticsArray;
      } finally {
        userAnalyticsInFlight.delete(userUid);
      }
    })();

    userAnalyticsInFlight.set(userUid, request);

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
