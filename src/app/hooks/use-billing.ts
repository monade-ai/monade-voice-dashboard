'use client';

import { useState, useCallback, useEffect } from 'react';

import { fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

// --- Types ---

export interface BillingConfigEntry {
  key: string;
  value: string;
  category: string;
}

export interface UserPricing {
  user_uid: string;
  pricing: Record<string, string>;
}

export interface Subscription {
  id: string;
  user_uid: string;
  feature: string;
  status: 'active' | 'cancelled' | 'expired';
  auto_renew: boolean;
  credits_per_cycle: number;
  cycle_start: string;
  cycle_end: string;
  created_at: string;
  updated_at?: string;
}

export interface LedgerEntry {
  id: string;
  event_type: 'topup' | 'bundle_purchase' | 'bundle_renewal' | 'bundle_cancel' | 'refund' | 'manual_adjustment';
  direction: 'credit' | 'debit';
  amount: string;
  balance_after: string;
  feature: string | null;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export interface LedgerResponse {
  entries: LedgerEntry[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// --- Billing Config Hook ---

export function useBillingConfig() {
  const [configs, setConfigs] = useState<BillingConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJson<{ configs: BillingConfigEntry[] }>(
        `${API_BASE}/api/billing/config`,
        { retry: { retries: 1 } },
      );
      setConfigs(Array.isArray(data.configs) ? data.configs : []);
      setError(null);
    } catch (err) {
      console.error('[useBillingConfig] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch billing config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const getConfig = useCallback(
    (key: string): string | undefined => configs.find(c => c.key === key)?.value,
    [configs],
  );

  return { configs, loading, error, getConfig, refetch: fetchConfig };
}

// --- User Pricing Hook ---

export function useUserPricing() {
  const { userUid } = useMonadeUser();
  const [pricing, setPricing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    if (!userUid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchJson<UserPricing>(
        `${API_BASE}/api/billing/user-pricing/${encodeURIComponent(userUid)}?keys=credit_value_inr_default`,
        { retry: { retries: 1 } },
      );
      setPricing(data.pricing || {});
      setError(null);
    } catch (err) {
      console.error('[useUserPricing] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  return { pricing, loading, error, refetch: fetchPricing };
}

// --- Subscriptions Hook ---

export function useSubscriptions() {
  const { userUid } = useMonadeUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    if (!userUid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchJson<any>(
        `${API_BASE}/api/billing/subscriptions/${encodeURIComponent(userUid)}`,
        { retry: { retries: 1 } },
      );
      const list = Array.isArray(data) ? data : Array.isArray(data.subscriptions) ? data.subscriptions : [];
      setSubscriptions(list);
      setError(null);
    } catch (err) {
      console.error('[useSubscriptions] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  const subscribe = useCallback(async (feature: string): Promise<boolean> => {
    if (!userUid) return false;
    setActionLoading(true);
    try {
      await fetchJson(
        `${API_BASE}/api/billing/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_uid: userUid, feature }),
          retry: { retries: 0 },
        },
      );
      await fetchSubscriptions();
      return true;
    } catch (err) {
      console.error('[useSubscriptions] Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [userUid, fetchSubscriptions]);

  const unsubscribe = useCallback(async (feature: string): Promise<boolean> => {
    if (!userUid) return false;
    setActionLoading(true);
    try {
      await fetchJson(
        `${API_BASE}/api/billing/unsubscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_uid: userUid, feature }),
          retry: { retries: 0 },
        },
      );
      await fetchSubscriptions();
      return true;
    } catch (err) {
      console.error('[useSubscriptions] Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [userUid, fetchSubscriptions]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { subscriptions, loading, error, actionLoading, subscribe, unsubscribe, refetch: fetchSubscriptions };
}

// --- Ledger Hook ---

export function useLedger() {
  const { userUid } = useMonadeUser();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async (opts?: { page?: number; limit?: number; event_type?: string }) => {
    if (!userUid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (opts?.page) params.set('page', String(opts.page));
      if (opts?.limit) params.set('limit', String(opts.limit));
      if (opts?.event_type) params.set('event_type', opts.event_type);
      const qs = params.toString();
      const data = await fetchJson<LedgerResponse>(
        `${API_BASE}/api/billing/ledger/${encodeURIComponent(userUid)}${qs ? `?${qs}` : ''}`,
        { retry: { retries: 1 } },
      );
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setError(null);
    } catch (err) {
      console.error('[useLedger] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return { entries, total, page, totalPages, loading, error, fetchLedger };
}
