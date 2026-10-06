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

export type WhatsappFlowMode = 'standard' | 'cv_24h_cadence' | 'cv_counselor_pilot';

export interface WhatsappPilotSchedule {
  timezone: 'Asia/Kolkata';
  call_window_start: '09:00';
  last_dial: '20:45';
  whatsapp_window_end: '21:00';
  day1_attempts: 6;
  day2_attempts: 4;
  day1_release_hours: 24;
  day2_release_hours: 48;
  release_guard_minutes: 30;
  min_call_gap_minutes: 60;
  failed_dial_retry_minutes: 15;
  whatsapp_after_call_minutes: number;
  reply_pause_minutes: number;
  band_targets: string[];
}

export interface WhatsappPilotConfig {
  schedule: WhatsappPilotSchedule;
  templates: Record<string, WhatsappCadenceTemplateAssignment>;
}

export interface WhatsappCadenceSchedule {
  timezone: string;
  call_window_start: string;
  call_window_end: string;
  c2_delay_minutes: number;
  evening_window_start: string;
  evening_window_end: string;
  c4_delay_minutes_min: number;
  c4_delay_minutes_max: number;
  late_lead_morning_start: string;
  late_lead_morning_end: string;
  whatsapp_window_start: string;
  whatsapp_window_end: string;
  max_touches_24h: number;
  m1_delay_days: number;
  m2_delay_days: number;
}

export interface WhatsappCadenceTemplateAssignment {
  template_name: string;
  language: string;
  template_name_no_name?: string | null;
}

export interface WhatsappCadenceConfig {
  schedule: WhatsappCadenceSchedule;
  templates: Record<string, WhatsappCadenceTemplateAssignment>;
}

export interface WhatsappCadenceTemplateRequirement {
  key: string;
  label: string;
  group: string;
  expected_category?: string;
  body?: string;
  footer?: string;
  buttons?: unknown[];
}

export interface WhatsappCadenceCapability {
  available: boolean;
  schedule: WhatsappCadenceSchedule | null;
  templates: WhatsappCadenceTemplateRequirement[];
}

export interface WhatsappFlowCapabilities {
  cv_24h_cadence: WhatsappCadenceCapability;
  cv_counselor_pilot: {
    available: boolean;
    schedule: WhatsappPilotSchedule | null;
    templates: WhatsappCadenceTemplateRequirement[];
  };
}

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
  flow_mode: WhatsappFlowMode;
  cadence_config: Partial<WhatsappCadenceConfig> | Partial<WhatsappPilotConfig>;
  cadence_draft_errors: string[];
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
  flow_mode?: WhatsappFlowMode;
  cadence_config?: WhatsappCadenceConfig | WhatsappPilotConfig | Record<string, never>;
}

const CADENCE_SLOT_GROUPS: Record<string, string> = {
  N1: 'No answer', N2: 'No answer', N3: 'No answer',
  U1: 'Uncertain', U2: 'Uncertain', U2a: 'Uncertain', U2b: 'Uncertain', U3: 'Uncertain',
  T1: 'Qualified', M1: 'Marketing', M2: 'Marketing',
};

const normalizeErrors = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeErrors(item));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const messages = normalizeErrors(item);

      return messages.map((message) => `${key}: ${message}`);
    });
  }

  return [String(value)];
};

const normalizeRequirement = (key: string, raw: any): WhatsappCadenceTemplateRequirement => ({
  key,
  label: raw?.label ?? raw?.name ?? key,
  group: raw?.group ?? CADENCE_SLOT_GROUPS[key] ?? 'Cadence',
  expected_category: raw?.expected_category ?? raw?.category ?? raw?.expected?.category,
  body: raw?.body
    ?? raw?.expected?.body
    ?? raw?.components?.find?.((part: any) => String(part?.type).toUpperCase() === 'BODY')?.text,
  footer: raw?.footer
    ?? raw?.expected?.footer
    ?? raw?.components?.find?.((part: any) => String(part?.type).toUpperCase() === 'FOOTER')?.text,
  buttons: raw?.buttons
    ?? raw?.expected?.buttons
    ?? raw?.components?.find?.((part: any) => String(part?.type).toUpperCase() === 'BUTTONS')?.buttons,
});

const normalizeCapabilities = (raw: any): WhatsappFlowCapabilities => {
  const cadence = raw?.cv_24h_cadence ?? raw?.capabilities?.cv_24h_cadence ?? {};
  const advertisedMode = raw?.available_modes?.find?.(
    (mode: any) => mode?.value === 'cv_24h_cadence',
  );
  const rawTemplates = cadence?.templates
    ?? cadence?.template_slots
    ?? cadence?.required_templates
    ?? cadence?.template_requirements
    ?? cadence?.defaults?.templates
    ?? {};
  const templates = Array.isArray(rawTemplates)
    ? rawTemplates.map((item: any) => normalizeRequirement(String(item?.key ?? item?.slot ?? ''), item))
      .filter((item: WhatsappCadenceTemplateRequirement) => item.key)
    : Object.entries(rawTemplates).map(([key, item]) => normalizeRequirement(key, item));
  const pilot = raw?.cv_counselor_pilot ?? raw?.capabilities?.cv_counselor_pilot ?? {};
  const pilotMode = raw?.available_modes?.find?.((mode: any) => mode?.value === 'cv_counselor_pilot');
  const pilotSlots = pilot?.templates
    ?? pilot?.template_slots
    ?? pilot?.required_templates
    ?? [];

  return {
    cv_24h_cadence: {
      available: cadence?.available === true
        || advertisedMode?.available === true
        || Boolean(raw?.cv_24h_cadence),
      schedule: (cadence?.schedule
        ?? cadence?.default_schedule
        ?? cadence?.schedule_defaults
        ?? cadence?.defaults?.schedule
        ?? null) as WhatsappCadenceSchedule | null,
      templates,
    },
    cv_counselor_pilot: {
      available: pilot?.available === true
        || pilotMode?.available === true
        || Boolean(raw?.cv_counselor_pilot),
      schedule: (pilot?.schedule
        ?? pilot?.default_schedule
        ?? pilot?.schedule_defaults
        ?? null) as WhatsappPilotSchedule | null,
      templates: Array.isArray(pilotSlots)
        ? pilotSlots.map((item: any) => typeof item === 'string'
          ? normalizeRequirement(item, { category: 'UTILITY' })
          : normalizeRequirement(String(item?.key ?? item?.slot ?? ''), item))
          .filter((item: WhatsappCadenceTemplateRequirement) => item.key)
        : Object.entries(pilotSlots).map(([key, item]) => normalizeRequirement(key, item)),
    },
  };
};

const normalizeFlow = (raw: any): WhatsappFlow => ({
  id: raw?.id,
  user_uid: raw?.user_uid ?? raw?.userUid,
  assistant_id: raw?.assistant_id ?? raw?.assistantId,
  post_processing_template_id: raw?.post_processing_template_id ?? raw?.postProcessingTemplateId,
  whatsapp_channel_connection_id: raw?.whatsapp_channel_connection_id ?? raw?.whatsappChannelConnectionId,
  enabled: Boolean(raw?.enabled),
  flow_mode: ['cv_24h_cadence', 'cv_counselor_pilot'].includes(raw?.flow_mode)
    ? raw.flow_mode : 'standard',
  cadence_config: (raw?.cadence_config && typeof raw.cadence_config === 'object') ? raw.cadence_config : {},
  cadence_draft_errors: normalizeErrors(raw?.cadence_draft_errors),
  mappings: (raw?.mappings && typeof raw.mappings === 'object') ? raw.mappings : {},
  assistant: raw?.assistant ?? null,
  whatsapp_channel_connection: raw?.whatsapp_channel_connection ?? raw?.whatsappChannelConnection ?? null,
  post_processing_template: raw?.post_processing_template ?? raw?.postProcessingTemplate ?? null,
});

const normalizeFlowList = (data: any): WhatsappFlow[] => {
  const list = Array.isArray(data)
    ? data
    : (data?.flows
      ?? data?.data
      ?? data?.items
      ?? data?.flow
      ?? (data?.assistant_id || data?.assistantId ? [data] : []));

  const normalizedList = Array.isArray(list) ? list : [list];

  return normalizedList.filter(Boolean).map(normalizeFlow);
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

  const fetchFlowCapabilities = useCallback(async (): Promise<WhatsappFlowCapabilities> => {
    if (!userUid) return normalizeCapabilities(null);

    const data = await fetchJson<any>(
      `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/flow-capabilities`,
      { retry: { retries: 1 } },
    );

    return normalizeCapabilities(data);
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
      if (flows[0]) {
        if (flows[0].cadence_draft_errors.length === 0 && result?.cadence_draft_errors) {
          flows[0].cadence_draft_errors = normalizeErrors(result.cadence_draft_errors);
        }

        return flows[0];
      }

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
    fetchFlowCapabilities,
    fetchAssistantFlow,
    saveFlow,
  };
}
