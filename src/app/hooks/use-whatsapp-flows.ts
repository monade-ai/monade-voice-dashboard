'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

export type CallDirection = 'inbound' | 'outbound' | 'both' | null;

export interface WhatsappFlowMappingEntry {
  template_name: string;
  language: string;
  parameters?: unknown[];
}

export type WhatsappFlowMappings = Record<string, WhatsappFlowMappingEntry>;

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
