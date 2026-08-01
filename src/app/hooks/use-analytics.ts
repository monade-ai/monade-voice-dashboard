'use client';

import { useState, useCallback, useRef } from 'react';

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
  data: AnalyticsPage;
  cachedAt: number;
}

const callAnalyticsCache = new Map<string, CachedCallAnalytics>();
const callAnalyticsInFlight = new Map<string, Promise<CallAnalytics | null>>();
const userAnalyticsCache = new Map<string, CachedUserAnalytics>();
const userAnalyticsInFlight = new Map<string, Promise<AnalyticsPage>>();

export interface AnalyticsPagination {
  limit: number;
  offset: number;
  count: number;
  total: number;
  hasMore: boolean;
}

export interface AnalyticsPage {
  analytics: CallAnalytics[];
  pagination: AnalyticsPagination;
}

export interface AnalyticsPageFilters {
  search?: string;
  verdicts?: string[];
  qualities?: string[];
  campaignIds?: string[];
  templateId?: string;
  verdict?: string;
  minConfidence?: number;
  excludeNegative?: boolean;
  direction?: 'all' | 'inbound' | 'outbound';
  durationRange?: 'all' | 'short' | 'medium' | 'long' | string;
  from?: string;
  to?: string;
}

export type FetchAnalyticsPageOptions = boolean | {
  forceRefresh?: boolean;
  limit?: number;
  offset?: number;
  filters?: AnalyticsPageFilters;
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

function normalizeFetchPageOptions(options: FetchAnalyticsPageOptions = false) {
  if (typeof options === 'boolean') {
    return { forceRefresh: options, limit: 20, offset: 0, filters: undefined };
  }

  return {
    forceRefresh: options.forceRefresh ?? false,
    limit: Math.min(Math.max(Math.trunc(options.limit ?? 20), 1), 100),
    offset: Math.max(Math.trunc(options.offset ?? 0), 0),
    filters: options.filters,
  };
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

// Serialise the user-analytics query. Kept as a standalone function so the page
// hook and the export pager below build byte-identical requests — the export
// must be scoped to exactly what the user is looking at.
function buildUserAnalyticsQuery(
  userUid: string,
  limit: number,
  offset: number,
  filters?: AnalyticsPageFilters,
): string {
  const query = new URLSearchParams({
    user_uid: userUid,
    limit: String(limit),
    offset: String(offset),
  });
  if (filters?.search?.trim()) query.set('search', filters.search.trim());
  if (filters?.verdicts?.length) query.set('verdicts', filters.verdicts.join(','));
  if (filters?.qualities?.length) query.set('qualities', filters.qualities.join(','));
  if (filters?.campaignIds?.length) query.set('campaign_ids', filters.campaignIds.join(','));
  if (filters?.templateId && filters.templateId !== 'all') query.set('template_id', filters.templateId);
  if (filters?.verdict && filters.verdict !== 'all') query.set('verdict', filters.verdict);
  if (typeof filters?.minConfidence === 'number') {
    query.set('min_confidence', String(filters.minConfidence));
  }
  if (filters?.excludeNegative) query.set('exclude_negative', 'true');
  if (filters?.direction && filters.direction !== 'all') query.set('direction', filters.direction);
  if (filters?.durationRange && filters.durationRange !== 'all') {
    query.set('duration_range', filters.durationRange);
  }
  if (filters?.from) query.set('from', filters.from);
  if (filters?.to) query.set('to', filters.to);

  return query.toString();
}

// Merge the inner analytics object with top-level call metadata.
// IMPORTANT: keep this allowlist in sync with the backend doc
// (docs/FRONTEND_CALL_DIRECTION_AND_BILLING_FIELDS.md).
// Anything NOT listed here gets dropped — that's how billing_data /
// provider_call_status / recording_metadata silently disappeared before.
function mergeAnalyticsRecord(item: any): CallAnalytics {
  return {
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
  };
}

function parseUserAnalyticsResponse(data: any, limit: number, offset: number): AnalyticsPage {
  let analyticsArray: CallAnalytics[] = [];
  if (Array.isArray(data)) {
    analyticsArray = data.map(item => (item.analytics ? mergeAnalyticsRecord(item) : item));
  } else if (data.analytics) {
    analyticsArray = Array.isArray(data.analytics)
      ? data.analytics.map((item: any) => (item.analytics ? mergeAnalyticsRecord(item) : item))
      : [data.analytics];
  }

  const responsePagination = data.pagination || {};

  return {
    analytics: analyticsArray,
    pagination: {
      limit: Number(responsePagination.limit ?? data.limit ?? limit),
      offset: Number(responsePagination.offset ?? data.offset ?? offset),
      count: Number(responsePagination.count ?? data.count ?? analyticsArray.length),
      total: Number(responsePagination.total ?? data.total ?? analyticsArray.length),
      hasMore: Boolean(responsePagination.has_more ?? data.has_more ?? false),
    },
  };
}

export interface FetchAllUserAnalyticsOptions {
  userUid: string;
  filters?: AnalyticsPageFilters;
  signal?: AbortSignal;
  /** Server page size to walk with. Clamped to the backend max of 100. */
  pageSize?: number;
  /** Hard safety cap on rows pulled into the browser. */
  maxRows?: number;
  /** Called after each page with running totals, for a progress indicator. */
  onProgress?: (loaded: number, total: number) => void;
}

// Row ceiling for a Full export (fetches a transcript per row, so it cannot
// scale) and for a Fast export (data-only, safe to go much larger).
export const FULL_EXPORT_MAX_ROWS = 50_000;
export const FAST_EXPORT_MAX_ROWS = 500_000;
// Fast exports flush one CSV file per this many rows so browser memory stays
// bounded regardless of total size, and a failure late in a long export still
// leaves the earlier files on disk.
export const EXPORT_FILE_CHUNK_ROWS = 100_000;
// Back-compat: existing callers (and the credit chart) import this as the
// generic default ceiling.
export const EXPORT_MAX_ROWS = FULL_EXPORT_MAX_ROWS;

/**
 * Stream every matching analytics row for an export, yielding one page-batch at
 * a time so the caller never has to hold the whole result set in memory.
 *
 * **Keyset pagination, not offset.** Offset pagination is linear on the server
 * — `offset=250000` makes it walk 250k index entries per request, and it gets
 * slower the deeper you go (the backend guide explicitly warns against paging an
 * export to the end of a large archive). Instead this carries a `created_at`
 * cursor: each batch asks for the next page *older than the last row seen*, so
 * every request stays at offset ~0 and cheap no matter how deep the walk goes.
 *
 * `created_at` collides (a bulk campaign writes many rows in the same
 * millisecond) and the list API exposes no id-cursor, so rows are de-duplicated
 * by `call_id` across the boundary re-fetch, and the offset is advanced *within*
 * a single stuck timestamp cluster to page through ties. This keeps the walk
 * correct without any backend change.
 *
 * This runs only on an explicit user action (Export), never on render.
 */
export async function* streamAllUserAnalytics(
  options: FetchAllUserAnalyticsOptions,
): AsyncGenerator<CallAnalytics[]> {
  const { userUid, filters, signal } = options;
  const pageSize = Math.min(Math.max(Math.trunc(options.pageSize ?? 100), 1), 100);
  const maxRows = Math.max(options.maxRows ?? FAST_EXPORT_MAX_ROWS, pageSize);

  const seen = new Set<string>();
  let cursorTo = filters?.to; // inclusive created_at upper bound; undefined = newest
  let offsetInWindow = 0;
  let emitted = 0;
  let guard = 0;

  for (;;) {
    if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');
    // Absolute backstop against a pathological loop (e.g. an endpoint that never
    // advances). Far above any real archive size at this page size.
    if ((guard += 1) > 5_000_000) break;

    const query = buildUserAnalyticsQuery(userUid, pageSize, offsetInWindow, { ...filters, to: cursorTo });
    const data = await fetchJson<any>(`${MONADE_API_BASE}/api/analytics?${query}`, { signal });
    const pageRows = parseUserAnalyticsResponse(data, pageSize, offsetInWindow).analytics;
    if (pageRows.length === 0) break;

    const fresh: CallAnalytics[] = [];
    for (const row of pageRows) {
      const id = row.call_id || row.id;
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      fresh.push(row);
    }

    if (fresh.length > 0) {
      const remaining = maxRows - emitted;
      const slice = fresh.length > remaining ? fresh.slice(0, remaining) : fresh;
      emitted += slice.length;
      yield slice;
      if (emitted >= maxRows) return;
    }

    // A short page means this cursor window is exhausted — and since the window
    // runs from the newest row down to the oldest, that means the whole set is done.
    if (pageRows.length < pageSize) break;

    const lastTs = pageRows[pageRows.length - 1]?.created_at;
    if (lastTs && lastTs === cursorTo) {
      // Every row in this page shares the cursor timestamp — a tie cluster larger
      // than one page. Go deeper into it by offset rather than moving the cursor.
      offsetInWindow += pageSize;
    } else {
      // Move the cursor down to the oldest row seen; the boundary rows at exactly
      // this timestamp get re-fetched next round and dropped by the seen-set.
      cursorTo = lastTs;
      offsetInWindow = 0;
    }
  }
}

/**
 * Collect every matching analytics row into one array (bounded by `maxRows`).
 *
 * A thin wrapper over {@link streamAllUserAnalytics} for callers that want the
 * whole set at once — small/medium exports and the credit-usage chart. Large
 * exports should consume the generator directly and flush as they go.
 */
export async function fetchAllUserAnalytics(
  options: FetchAllUserAnalyticsOptions,
): Promise<{ rows: CallAnalytics[]; total: number; truncated: boolean }> {
  const maxRows = Math.max(options.maxRows ?? EXPORT_MAX_ROWS, 1);
  const rows: CallAnalytics[] = [];

  for await (const batch of streamAllUserAnalytics({ ...options, maxRows })) {
    rows.push(...batch);
    options.onProgress?.(rows.length, rows.length);
  }

  // The stream stops exactly at maxRows when more remain, so hitting it is the
  // truncation signal. (A set of exactly maxRows reads as truncated too — a
  // harmless over-warning at a boundary that large archives won't sit on.)
  return { rows, total: rows.length, truncated: rows.length >= maxRows };
}

/**
 * Count matching analytics rows without pulling them.
 *
 * Requests a single row and reads `pagination.total`, so an export preview can
 * show exactly how many records a set of filters (e.g. a date/time window) would
 * export before the user commits to the full walk.
 */
export async function fetchUserAnalyticsCount(
  userUid: string,
  filters?: AnalyticsPageFilters,
  signal?: AbortSignal,
): Promise<number> {
  const query = buildUserAnalyticsQuery(userUid, 1, 0, filters);
  const data = await fetchJson<any>(`${MONADE_API_BASE}/api/analytics?${query}`, { signal });

  return parseUserAnalyticsResponse(data, 1, 0).pagination.total;
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

const EMPTY_ANALYTICS_PAGINATION: AnalyticsPagination = {
  limit: 20,
  offset: 0,
  count: 0,
  total: 0,
  hasMore: false,
};

// Hook to fetch one bounded analytics page for the user.
export function useUserAnalytics() {
  const { userUid } = useMonadeUser();
  const [analytics, setAnalytics] = useState<CallAnalytics[]>([]);
  const [pagination, setPagination] = useState<AnalyticsPagination>(EMPTY_ANALYTICS_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Page and filter changes each start a request, so several can be in flight at
  // once (page forward twice quickly, or a debounced search landing while a page
  // change is still resolving). Responses are not guaranteed to arrive in the
  // order they were sent, and a slow earlier response would otherwise overwrite
  // state with the wrong page. Only the newest request is allowed to publish.
  const requestSeq = useRef(0);

  const fetchPage = useCallback(async (options: FetchAnalyticsPageOptions = false): Promise<AnalyticsPage> => {
    const { forceRefresh, limit, offset, filters } = normalizeFetchPageOptions(options);
    requestSeq.current += 1;
    const seq = requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;

    if (!userUid) {
      const emptyPage = {
        analytics: [],
        pagination: { ...EMPTY_ANALYTICS_PAGINATION, limit, offset },
      };
      if (isCurrent()) {
        setAnalytics([]);
        setPagination(emptyPage.pagination);
      }

      return emptyPage;
    }

    const scopedUserKey = analyticsCacheKey(userUid, USER_ANALYTICS_RESOURCE, {
      userUid,
      limit,
      offset,
      filters,
    });

    if (!forceRefresh) {
      const cached = userAnalyticsCache.get(scopedUserKey);
      if (cached && Date.now() - cached.cachedAt < USER_ANALYTICS_CACHE_TTL_MS) {
        if (isCurrent()) {
          setAnalytics(cached.data.analytics);
          setPagination(cached.data.pagination);
          setError(null);
          setLoading(false);
        }

        return cached.data;
      }

      const persisted = readLocalCache<AnalyticsPage>(scopedUserKey);
      if (persisted) {
        userAnalyticsCache.set(scopedUserKey, { data: persisted.value, cachedAt: persisted.cachedAt });
        if (isCurrent()) {
          setAnalytics(persisted.value.analytics);
          setPagination(persisted.value.pagination);
          setError(null);
          setLoading(false);
        }

        return persisted.value;
      }
    }

    if (!forceRefresh) {
      const inFlight = userAnalyticsInFlight.get(scopedUserKey);
      if (inFlight) {
        const result = await inFlight;
        if (isCurrent()) {
          setAnalytics(result.analytics);
          setPagination(result.pagination);
          setError(null);
          setLoading(false);
        }

        return result;
      }
    }

    const request = (async () => {
      try {
        const query = buildUserAnalyticsQuery(userUid, limit, offset, filters);
        const data = await fetchJson<any>(`${MONADE_API_BASE}/api/analytics?${query}`);
        const page = parseUserAnalyticsResponse(data, limit, offset);

        userAnalyticsCache.set(scopedUserKey, { data: page, cachedAt: Date.now() });
        writeLocalCache(scopedUserKey, page, USER_ANALYTICS_CACHE_TTL_MS);

        return page;
      } finally {
        userAnalyticsInFlight.delete(scopedUserKey);
      }
    })();

    userAnalyticsInFlight.set(scopedUserKey, request);

    try {
      setLoading(true);
      setError(null);
      const page = await request;
      if (isCurrent()) {
        setAnalytics(page.analytics);
        setPagination(page.pagination);
      }

      return page;
    } catch (err) {
      console.warn('[useUserAnalytics] Failed to fetch user analytics:', err);
      if (isCurrent()) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        setAnalytics([]);
        setPagination({ ...EMPTY_ANALYTICS_PAGINATION, limit, offset });
      }

      return {
        analytics: [],
        pagination: { ...EMPTY_ANALYTICS_PAGINATION, limit, offset },
      };
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userUid]);

  // Compatibility alias for older consumers. It now returns only the requested
  // page and never walks every page behind the caller's back.
  const fetchAll = useCallback(async (options: FetchAnalyticsPageOptions = false) => {
    const page = await fetchPage(options);

    return page.analytics;
  }, [fetchPage]);

  return {
    analytics,
    pagination,
    loading,
    error,
    fetchPage,
    fetchAll,
  };
}

export default useCallAnalytics;
