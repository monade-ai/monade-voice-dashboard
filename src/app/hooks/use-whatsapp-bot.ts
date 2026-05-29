'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { MONADE_API_BASE } from '@/config';
import { ApiError, fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

export type WhatsappBotModel = 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-3.1-flash-lite';
export type WhatsappBotThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface WhatsappBotGenerationConfig {
  temperature: number;
  top_p: number;
  max_output_tokens: number;
  thinking_budget?: number;
  thinking_level?: WhatsappBotThinkingLevel;
}

export interface WhatsappBotQualificationConfig {
  enabled: boolean;
  event_type?: 'whatsapp.lead_qualified';
  min_confidence?: number;
  dedupe_window_seconds?: number;
  include_conversation?: boolean;
  include_call_context?: boolean;
  criteria_addendum?: string;
}

export interface WhatsappBotPrompt {
  id: string;
  user_uid?: string | null;
  name: string;
  filename: string;
  gcs_url?: string | null;
  prompt_text?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsappBotConfig {
  id?: string;
  user_uid?: string | null;
  whatsapp_channel_connection_id: string;
  whatsapp_bot_prompt_id: string | null;
  enabled: boolean;
  model: WhatsappBotModel;
  generation_config: WhatsappBotGenerationConfig;
  qualification_config?: WhatsappBotQualificationConfig;
  whatsapp_channel_connection?: {
    id?: string;
    label?: string | null;
    display_name?: string | null;
    phone_number?: string | null;
    channel_id?: string | null;
    connection_status?: string | null;
  } | null;
  whatsapp_bot_prompt?: WhatsappBotPrompt | null;
}

export interface WhatsappBotPromptPayload {
  name: string;
  filename: string;
  prompt_text: string;
}

export interface SaveWhatsappBotConfigPayload {
  enabled: boolean;
  whatsapp_bot_prompt_id: string | null;
  model: WhatsappBotModel;
  generation_config: WhatsappBotGenerationConfig;
  qualification_config?: WhatsappBotQualificationConfig;
}

export const DEFAULT_WHATSAPP_BOT_CONFIG: Omit<WhatsappBotConfig, 'whatsapp_channel_connection_id'> = {
  enabled: false,
  whatsapp_bot_prompt_id: null,
  model: 'gemini-2.0-flash',
  generation_config: {
    temperature: 0.4,
    top_p: 0.9,
    max_output_tokens: 512,
  },
  qualification_config: {
    enabled: false,
    event_type: 'whatsapp.lead_qualified',
    min_confidence: 0.8,
    dedupe_window_seconds: 2592000,
    include_conversation: true,
    include_call_context: true,
    criteria_addendum: '',
  },
};

const normalizePrompt = (raw: any): WhatsappBotPrompt => ({
  id: raw?.id ?? raw?.prompt_id,
  user_uid: raw?.user_uid ?? raw?.userUid ?? null,
  name: raw?.name ?? 'Untitled Prompt',
  filename: raw?.filename ?? 'prompt.txt',
  gcs_url: raw?.gcs_url ?? raw?.gcsUrl ?? raw?.url ?? null,
  prompt_text: raw?.prompt_text ?? raw?.promptText ?? raw?.content ?? null,
  created_at: raw?.created_at ?? raw?.createdAt,
  updated_at: raw?.updated_at ?? raw?.updatedAt,
});

const normalizePromptList = (data: any): WhatsappBotPrompt[] => {
  const list = Array.isArray(data)
    ? data
    : (data?.prompts ?? data?.data ?? data?.items ?? []);

  return Array.isArray(list) ? list.filter(Boolean).map(normalizePrompt) : [];
};

const normalizeGenerationConfig = (raw: any): WhatsappBotGenerationConfig => ({
  temperature: typeof raw?.temperature === 'number' ? raw.temperature : 0.4,
  top_p: typeof raw?.top_p === 'number' ? raw.top_p : (typeof raw?.topP === 'number' ? raw.topP : 0.9),
  max_output_tokens: typeof raw?.max_output_tokens === 'number'
    ? raw.max_output_tokens
    : (typeof raw?.maxOutputTokens === 'number' ? raw.maxOutputTokens : 512),
  thinking_budget: typeof raw?.thinking_budget === 'number'
    ? raw.thinking_budget
    : (typeof raw?.thinkingBudget === 'number' ? raw.thinkingBudget : undefined),
  thinking_level: raw?.thinking_level ?? raw?.thinkingLevel ?? undefined,
});

const normalizeQualificationConfig = (raw: any): WhatsappBotQualificationConfig => ({
  enabled: Boolean(raw?.enabled),
  event_type: 'whatsapp.lead_qualified',
  min_confidence: typeof raw?.min_confidence === 'number'
    ? raw.min_confidence
    : (typeof raw?.minConfidence === 'number' ? raw.minConfidence : 0.8),
  dedupe_window_seconds: typeof raw?.dedupe_window_seconds === 'number'
    ? raw.dedupe_window_seconds
    : (typeof raw?.dedupeWindowSeconds === 'number' ? raw.dedupeWindowSeconds : 2592000),
  include_conversation: typeof raw?.include_conversation === 'boolean'
    ? raw.include_conversation
    : (typeof raw?.includeConversation === 'boolean' ? raw.includeConversation : true),
  include_call_context: typeof raw?.include_call_context === 'boolean'
    ? raw.include_call_context
    : (typeof raw?.includeCallContext === 'boolean' ? raw.includeCallContext : true),
  criteria_addendum: raw?.criteria_addendum ?? raw?.criteriaAddendum ?? '',
});

const normalizeBotConfig = (raw: any): WhatsappBotConfig => ({
  id: raw?.id,
  user_uid: raw?.user_uid ?? raw?.userUid ?? null,
  whatsapp_channel_connection_id: raw?.whatsapp_channel_connection_id ?? raw?.whatsappChannelConnectionId,
  whatsapp_bot_prompt_id: raw?.whatsapp_bot_prompt_id ?? raw?.whatsappBotPromptId ?? null,
  enabled: Boolean(raw?.enabled),
  model: raw?.model ?? 'gemini-2.0-flash',
  generation_config: normalizeGenerationConfig(raw?.generation_config ?? raw?.generationConfig ?? {}),
  qualification_config: normalizeQualificationConfig(raw?.qualification_config ?? raw?.qualificationConfig ?? {}),
  whatsapp_channel_connection: raw?.whatsapp_channel_connection ?? raw?.whatsappChannelConnection ?? null,
  whatsapp_bot_prompt: raw?.whatsapp_bot_prompt ? normalizePrompt(raw.whatsapp_bot_prompt) : (raw?.whatsappBotPrompt ? normalizePrompt(raw.whatsappBotPrompt) : null),
});

const normalizeBotConfigList = (data: any): WhatsappBotConfig[] => {
  const list = Array.isArray(data)
    ? data
    : (data?.configs ?? data?.bot_configs ?? data?.data ?? data?.items ?? []);

  return Array.isArray(list) ? list.filter(Boolean).map(normalizeBotConfig) : [];
};

const extractErrorDetails = (error: unknown): string[] => {
  if (!(error instanceof ApiError)) return [];
  const details = (error.data as any)?.details;

  return Array.isArray(details) ? details.filter((detail): detail is string => typeof detail === 'string') : [];
};

export function useWhatsappBot() {
  const { userUid } = useMonadeUser();
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);

  const fetchPrompts = useCallback(async (): Promise<WhatsappBotPrompt[]> => {
    if (!userUid) return [];

    try {
      setLoadingPrompts(true);
      const data = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/bot-prompts`,
        { retry: { retries: 1 } },
      );

      return normalizePromptList(data);
    } catch (error) {
      console.error('[useWhatsappBot] fetchPrompts error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load WhatsApp bot prompts');

      return [];
    } finally {
      setLoadingPrompts(false);
    }
  }, [userUid]);

  const fetchPrompt = useCallback(async (promptId: string): Promise<WhatsappBotPrompt | null> => {
    if (!userUid || !promptId) return null;

    const data = await fetchJson<any>(
      `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/bot-prompts/${encodeURIComponent(promptId)}?include_content=true`,
      { retry: { retries: 1 } },
    );

    return normalizePrompt(data?.prompt ?? data);
  }, [userUid]);

  const createPrompt = useCallback(async (payload: WhatsappBotPromptPayload): Promise<WhatsappBotPrompt | null> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSavingPrompt(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/bot-prompts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          retry: { retries: 0 },
        },
      );
      toast.success('Bot prompt created');

      return normalizePrompt(result?.prompt ?? result);
    } catch (error) {
      console.error('[useWhatsappBot] createPrompt error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create bot prompt');
      throw error;
    } finally {
      setSavingPrompt(false);
    }
  }, [userUid]);

  const updatePrompt = useCallback(async (promptId: string, payload: WhatsappBotPromptPayload): Promise<WhatsappBotPrompt | null> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSavingPrompt(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/bot-prompts/${encodeURIComponent(promptId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          retry: { retries: 0 },
        },
      );
      toast.success('Bot prompt updated');

      return normalizePrompt(result?.prompt ?? result);
    } catch (error) {
      console.error('[useWhatsappBot] updatePrompt error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update bot prompt');
      throw error;
    } finally {
      setSavingPrompt(false);
    }
  }, [userUid]);

  const deletePrompt = useCallback(async (promptId: string): Promise<void> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setDeletingPromptId(promptId);
      await fetchJson(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/bot-prompts/${encodeURIComponent(promptId)}`,
        {
          method: 'DELETE',
          retry: { retries: 0 },
        },
      );
      toast.success('Bot prompt deleted');
    } catch (error) {
      console.error('[useWhatsappBot] deletePrompt error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete bot prompt');
      throw error;
    } finally {
      setDeletingPromptId(null);
    }
  }, [userUid]);

  const fetchConfigs = useCallback(async (): Promise<WhatsappBotConfig[]> => {
    if (!userUid) return [];

    try {
      setLoadingConfigs(true);
      const data = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/bot-configs`,
        { retry: { retries: 1 } },
      );

      return normalizeBotConfigList(data);
    } catch (error) {
      console.error('[useWhatsappBot] fetchConfigs error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load WhatsApp bot configs');

      return [];
    } finally {
      setLoadingConfigs(false);
    }
  }, [userUid]);

  const saveConfig = useCallback(async (
    connectionId: string,
    payload: SaveWhatsappBotConfigPayload,
  ): Promise<{ config: WhatsappBotConfig | null; details: string[] }> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSavingConfig(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels/${encodeURIComponent(connectionId)}/bot-config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          retry: { retries: 0 },
        },
      );
      toast.success('WhatsApp bot config saved');

      return {
        config: normalizeBotConfig(result?.config ?? result),
        details: [],
      };
    } catch (error) {
      console.error('[useWhatsappBot] saveConfig error:', error);
      const details = extractErrorDetails(error);
      if (details.length === 0) {
        toast.error(error instanceof Error ? error.message : 'Failed to save WhatsApp bot config');
      }
      throw Object.assign(error instanceof Error ? error : new Error('Failed to save WhatsApp bot config'), { details });
    } finally {
      setSavingConfig(false);
    }
  }, [userUid]);

  return {
    loadingPrompts,
    loadingConfigs,
    savingPrompt,
    savingConfig,
    deletingPromptId,
    fetchPrompts,
    fetchPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    fetchConfigs,
    saveConfig,
  };
}
