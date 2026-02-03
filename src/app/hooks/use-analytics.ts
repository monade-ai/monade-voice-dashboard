'use client';

import { useState, useCallback } from 'react';

import { useMonadeUser } from './use-monade-user';

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

  const fetchByCallId = useCallback(async (callId: string) => {
    if (!callId) return null;

    try {
      setLoading(true);
      setError(null);

      console.log('[useCallAnalytics] Fetching analytics for call:', callId);

      // Use the /api/analytics/{call_id} endpoint
      const response = await fetch(`/api/proxy/api/analytics/${callId}`);

      console.log('[useCallAnalytics] Response status:', response.status, response.ok);

      if (!response.ok) {
        if (response.status === 404) {
          // No analytics for this call yet - not an error
          console.log('[useCallAnalytics] No analytics found (404)');
          setAnalytics(null);

          return null;
        }
        console.warn('[useCallAnalytics] Analytics not available:', response.status);

        return null;
      }

      const data = await response.json();
      console.log('[useCallAnalytics] Fetched analytics data:', data);

      // Extract the nested analytics object
      const analyticsData = data.analytics || data;
      console.log('[useCallAnalytics] Extracted analytics:', analyticsData);

      setAnalytics(analyticsData);

      return analyticsData as CallAnalytics;
    } catch (err) {
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

  const fetchAll = useCallback(async () => {
    if (!userUid) {
      console.warn('[useUserAnalytics] No user UID available');
      setAnalytics([]);

      return [];
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useUserAnalytics] Fetching all analytics for user:', userUid);

      // Use the /api/analytics?user_uid={user_uid} endpoint
      const response = await fetch(`/api/proxy/api/analytics?user_uid=${userUid}`);

      console.log('[useUserAnalytics] Response status:', response.status, response.ok);

      if (!response.ok) {
        console.warn('[useUserAnalytics] User analytics not available:', response.status);
        setAnalytics([]);

        return [];
      }

      const data = await response.json();
      console.log('[useUserAnalytics] Raw response:', data);
      console.log('[useUserAnalytics] First item structure:', data[0]);

      // Handle different response structures
      let analyticsArray: CallAnalytics[] = [];

      if (Array.isArray(data)) {
        // If response is array, each item has structure:
        // { id, call_id, user_uid, phone_number, created_at, analytics: {...} }
        analyticsArray = data.map(item => {
          if (item.analytics) {
            // Merge top-level fields with nested analytics
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
        // If response has analytics property
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

      console.log('[useUserAnalytics] Extracted analytics array:', analyticsArray);
      console.log('[useUserAnalytics] Total analytics:', analyticsArray.length);
      console.log('[useUserAnalytics] First extracted item:', analyticsArray[0]);

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
