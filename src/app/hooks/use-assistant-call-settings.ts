'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';

const API_BASE = MONADE_API_BASE;

// Backend contract: integer seconds, 60 .. global_hard_limit_seconds (currently 900).
export const MIN_CALL_DURATION_SECONDS = 60;
export const DEFAULT_GLOBAL_HARD_LIMIT_SECONDS = 900;

export interface AssistantCallSettings {
  assistant_id: string;
  user_uid?: string;
  /** null means the assistant inherits the global limit. */
  max_call_duration_seconds: number | null;
  global_hard_limit_seconds: number;
  effective_max_call_duration_seconds: number;
  source: string;
}

const normalizeSettings = (assistantId: string, data: any): AssistantCallSettings => {
  const globalLimit = Number(data?.global_hard_limit_seconds) || DEFAULT_GLOBAL_HARD_LIMIT_SECONDS;
  const raw = data?.max_call_duration_seconds;
  const custom = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;

  return {
    assistant_id: data?.assistant_id ?? assistantId,
    user_uid: data?.user_uid,
    max_call_duration_seconds: custom,
    global_hard_limit_seconds: globalLimit,
    effective_max_call_duration_seconds: Number(data?.effective_max_call_duration_seconds) || custom || globalLimit,
    source: data?.source ?? (custom === null ? 'global_fallback' : 'assistant'),
  };
};

/**
 * Reads and updates the per-assistant hard call-duration limit.
 * Auth rides on the dashboard session cookie — fetchJson sends `credentials: 'include'` by default.
 */
export function useAssistantCallSettings(assistantId?: string | null, enabled = true) {
  const [settings, setSettings] = useState<AssistantCallSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assistantId || !enabled) {
      setSettings(null);

      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchJson<any>(
          `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/call-settings`,
          { retry: { retries: 1 } },
        );
        if (!cancelled) setSettings(normalizeSettings(assistantId, data));
      } catch (err) {
        if (!cancelled) {
          console.error('[useAssistantCallSettings] Failed to load call settings:', err);
          setSettings(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [assistantId, enabled]);

  /** Pass seconds to set a custom limit, or null to inherit the global limit. */
  const saveLimit = useCallback(async (secondsOrNull: number | null): Promise<boolean> => {
    if (!assistantId) return false;
    setSaving(true);
    try {
      const data = await fetchJson<any>(
        `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/call-settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            max_call_duration_seconds: secondsOrNull === null ? null : Math.round(secondsOrNull),
          }),
          retry: { retries: 0 },
        },
      );
      // Response is authoritative — replace local state with what the backend stored.
      setSettings(normalizeSettings(assistantId, data));
      toast.success(
        secondsOrNull === null
          ? 'Call limit reset to the global maximum'
          : `Call limit set to ${Math.round(secondsOrNull / 60)} min`,
      );

      return true;
    } catch (err) {
      console.error('[useAssistantCallSettings] Failed to update call settings:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update call-duration limit');

      return false;
    } finally {
      setSaving(false);
    }
  }, [assistantId]);

  return { settings, loading, saving, saveLimit };
}
