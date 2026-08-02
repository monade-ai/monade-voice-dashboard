'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

export type CallDirection = 'inbound' | 'outbound' | 'both' | null;

/**
 * Which follow-up call this step answers to. Only the uncertain track branches:
 * the second touch differs depending on whether the follow-up call was missed
 * (U2a) or connected again and stayed vague (U2b).
 */
export type WhatsappFlowStepCondition = 'always' | 'missed' | 'connected';

export interface WhatsappFlowStep {
  /** Cadence key the scheduler selects on: N1, N2, N3, U1, U2a, U2b, U3, T1, M1, M2. */
  key: string;
  template_name: string;
  language: string;
  /**
   * Approved variant with no {{name}} placeholder. Required whenever the main
   * template greets by name: Meta rejects empty template parameters, so a lead
   * with no usable name can only be messaged through a separate template.
   * Without one, the send is skipped rather than greeting them "Hi there".
   */
  template_name_no_name?: string | null;
  condition?: WhatsappFlowStepCondition;
  enabled?: boolean;
  parameters?: unknown[];
}

/**
 * A bucket maps to an ordered sequence of templates.
 *
 * Step 1 is the post-call follow-up that has always been sent. Steps 2+ are the
 * first-24h ladder touches sent by the cadence scheduler. The legacy shape
 * (a bare template_name/language on the entry) is still accepted by the API and
 * reads as a one-step sequence.
 */
export interface WhatsappFlowMappingEntry {
  template_name?: string;
  language?: string;
  parameters?: unknown[];
  steps?: WhatsappFlowStep[];
  enabled?: boolean;
}

export type WhatsappFlowMappings = Record<string, WhatsappFlowMappingEntry>;

/** Read either mapping shape as a step list. */
export const mappingToSteps = (entry?: WhatsappFlowMappingEntry | null): WhatsappFlowStep[] => {
  if (!entry || typeof entry !== 'object') return [];
  if (Array.isArray(entry.steps)) {
    return entry.steps
      .filter((step) => step && typeof step === 'object' && step.template_name)
      .map((step, index) => ({
        key: String(step.key || '').trim() || `step_${index + 1}`,
        template_name: String(step.template_name),
        language: String(step.language ?? ''),
        template_name_no_name: step.template_name_no_name ?? null,
        condition: step.condition ?? 'always',
        enabled: step.enabled !== false,
      }));
  }
  if (!entry.template_name) return [];

  return [{
    key: 'step_1',
    template_name: String(entry.template_name),
    language: String(entry.language ?? ''),
    template_name_no_name: null,
    condition: 'always',
    enabled: true,
  }];
};

/** Write the sequence shape the API expects. */
export const stepsToMapping = (steps: WhatsappFlowStep[]): WhatsappFlowMappingEntry => ({
  steps: steps.map((step) => ({
    key: step.key,
    template_name: step.template_name,
    language: step.language,
    ...(step.template_name_no_name ? { template_name_no_name: step.template_name_no_name } : {}),
    ...(step.condition && step.condition !== 'always' ? { condition: step.condition } : {}),
    parameters: [],
  })),
});

export interface WhatsappFlow {
  id?: string;
  user_uid?: string;
  assistant_id: string;
  post_processing_template_id: string;
  whatsapp_channel_connection_id: string;
  enabled: boolean;
  mappings: WhatsappFlowMappings;
  assistant?: {
    id?: string;
    name?: string;
    call_direction?: CallDirection;
  } | null;
  whatsapp_channel_connection?: {
    id?: string;
    channel_id?: string;
    phone_number?: string;
    display_name?: string | null;
  } | null;
  post_processing_template?: {
    id?: string;
    name?: string;
    outcome_keys?: string[];
  } | null;
}

export interface WhatsappFlowFilters {
  whatsapp_channel_connection_id?: string;
  assistant_id?: string;
  post_processing_template_id?: string;
  enabled?: boolean;
}

export interface SaveWhatsappFlowPayload {
  post_processing_template_id: string;
  whatsapp_channel_connection_id: string;
  enabled: boolean;
  mappings: WhatsappFlowMappings;
}

const normalizeFlow = (raw: any): WhatsappFlow => ({
  id: raw?.id,
  user_uid: raw?.user_uid ?? raw?.userUid,
  assistant_id: raw?.assistant_id ?? raw?.assistantId,
  post_processing_template_id: raw?.post_processing_template_id ?? raw?.postProcessingTemplateId,
  whatsapp_channel_connection_id: raw?.whatsapp_channel_connection_id ?? raw?.whatsappChannelConnectionId,
  enabled: Boolean(raw?.enabled),
  mappings: (raw?.mappings && typeof raw.mappings === 'object') ? raw.mappings : {},
  assistant: raw?.assistant ?? null,
  whatsapp_channel_connection: raw?.whatsapp_channel_connection ?? raw?.whatsappChannelConnection ?? null,
  post_processing_template: raw?.post_processing_template ?? raw?.postProcessingTemplate ?? null,
});

const normalizeFlowList = (data: any): WhatsappFlow[] => {
  const list = Array.isArray(data) ? data : (data?.flows ?? data?.data ?? data?.items ?? []);

  return Array.isArray(list) ? list.filter(Boolean).map(normalizeFlow) : [];
};

/**
 * WhatsApp follow-up flows: one row per assistant + post-processing template.
 *
 * `fetchFlows` hits the bulk endpoint (used for the Templates "Used by" column);
 * `fetchAssistantFlow` / `saveFlow` drive the per-assistant editor.
 */
export function useWhatsappFlows() {
  const { userUid } = useMonadeUser();
  const [savingFlow, setSavingFlow] = useState(false);

  const fetchFlows = useCallback(async (filters?: WhatsappFlowFilters): Promise<WhatsappFlow[]> => {
    if (!userUid) return [];

    const params = new URLSearchParams();
    if (filters?.whatsapp_channel_connection_id) {
      params.set('whatsapp_channel_connection_id', filters.whatsapp_channel_connection_id);
    }
    if (filters?.assistant_id) params.set('assistant_id', filters.assistant_id);
    if (filters?.post_processing_template_id) {
      params.set('post_processing_template_id', filters.post_processing_template_id);
    }
    if (typeof filters?.enabled === 'boolean') params.set('enabled', String(filters.enabled));

    const query = params.toString();
    const data = await fetchJson<any>(
      `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/flows${query ? `?${query}` : ''}`,
      { retry: { retries: 1 } },
    );

    return normalizeFlowList(data);
  }, [userUid]);

  const fetchAssistantFlow = useCallback(async (
    assistantId: string,
    postProcessingTemplateId: string,
  ): Promise<WhatsappFlow | null> => {
    if (!userUid || !assistantId || !postProcessingTemplateId) return null;

    const params = new URLSearchParams({
      user_uid: userUid,
      post_processing_template_id: postProcessingTemplateId,
    });
    const data = await fetchJson<any>(
      `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/whatsapp-flow?${params.toString()}`,
      { retry: { retries: 1 } },
    );
    const flows = normalizeFlowList(data);

    return flows[0] ?? null;
  }, [userUid]);

  const saveFlow = useCallback(async (
    assistantId: string,
    payload: SaveWhatsappFlowPayload,
  ): Promise<WhatsappFlow | null> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSavingFlow(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/whatsapp-flow`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_uid: userUid, ...payload }),
          retry: { retries: 0 },
        },
      );
      toast.success('WhatsApp flow saved');
      const flows = normalizeFlowList(result);
      if (flows[0]) return flows[0];

      return result?.flow ? normalizeFlow(result.flow) : null;
    } catch (err) {
      console.error('[useWhatsappFlows] saveFlow error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save WhatsApp flow');
      throw err;
    } finally {
      setSavingFlow(false);
    }
  }, [userUid]);

  return {
    savingFlow,
    fetchFlows,
    fetchAssistantFlow,
    saveFlow,
  };
}
