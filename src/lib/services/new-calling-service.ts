// lib/services/new-calling-service.ts

import { fetchJson } from '@/lib/http';

interface CalleeInfo {
  [key: string]: string;
}

interface NewCallingParams {
  phone_number: string;
  callee_info: CalleeInfo;
  assistant_id: string;
  trunk_name: string; // Selected trunk: 'twilio' or 'vobiz'
  api_key?: string; // Optional override; backend can use server-side key
  user_uid: string; // User UID for trunk ownership validation
  use_case?: string; // Optional use case key, e.g. "sales" | "support"
  prompt_url?: string; // Optional direct prompt URL override
  knowledge_base_url?: string; // Optional direct knowledge base URL override
  knowledge_base_id?: string; // Optional KB ID (backend resolves to URL)
  use_case_prompt_map?: Record<string, string>; // Optional per-request use case map
}

const DEFAULT_VOICE_AGENTS_BASE = 'https://service.monade.ai/voice_agents';
const RAW_VOICE_AGENTS_BASE = process.env.NEXT_PUBLIC_VOICE_AGENTS_URL || DEFAULT_VOICE_AGENTS_BASE;
const TRUNK_NAME_MAP: Record<string, string> = {
  twilio: 'Twilio',
  vobiz: 'Vobiz-SIP',
};

function normalizeVoiceAgentsBase(rawBase: string): string {
  const normalized = rawBase.trim().replace(/\/+$/, '');
  const typoFixed = normalized.replace('service.moande.ai', 'service.monade.ai');
  return typoFixed.endsWith('/voice_agents') ? typoFixed : `${typoFixed}/voice_agents`;
}

function formatPhoneNumber(phoneNumber: string): string {
  const formatted = phoneNumber.trim().replace(/[^\d+]/g, '');
  if (!formatted.startsWith('+')) {
    throw new Error(
      'Phone number must include country code in E.164 format (for example +14155551234).',
    );
  }
  return formatted;
}

export async function initiateNewCall(params: NewCallingParams): Promise<unknown> {
  console.log('[NewCallingService] initiateNewCall called with params:', {
    ...params,
    api_key: params.api_key ? `${params.api_key.substring(0, 20)}...` : 'NOT PROVIDED',
  });

  if (!params.trunk_name) {
    throw new Error('Please select a trunk (Twilio or Vobiz) to make the call.');
  }

  if (!params.user_uid) {
    throw new Error('User UID is required to validate trunk ownership.');
  }

  const voiceAgentsBase = normalizeVoiceAgentsBase(RAW_VOICE_AGENTS_BASE);
  const formattedPhone = formatPhoneNumber(params.phone_number);
  const resolvedTrunkName = TRUNK_NAME_MAP[params.trunk_name?.toLowerCase()] || params.trunk_name;

  // Prepare payload for control-plane
  const payload = {
    assistant_id: params.assistant_id,
    user_uid: params.user_uid, // User UID for trunk ownership validation
    metadata: {
      ...(params.callee_info || {}),
      ...(params.use_case ? { use_case: params.use_case } : {}),
      ...(params.knowledge_base_id ? { knowledge_base_id: params.knowledge_base_id } : {}),
      ...(params.knowledge_base_url ? { knowledge_base_url: params.knowledge_base_url } : {}),
      ...(params.prompt_url ? { prompt_url: params.prompt_url } : {}),
      ...(params.use_case_prompt_map ? { use_case_prompt_map: params.use_case_prompt_map } : {}),
    },
    telephony: {
      trunk_name: resolvedTrunkName,
    },
    ...(params.prompt_url ? { prompt_url: params.prompt_url } : {}),
  };

  const targetUrl = `${voiceAgentsBase}/outbound-call/${encodeURIComponent(formattedPhone)}`;
  console.log('[NewCallingService] SENDING POST to voice_agents outbound-call:', JSON.stringify({
    url: targetUrl,
    ...payload,
  }));

  return fetchJson(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
    timeoutMs: 30000,
    retry: { retries: 0 },
  });
}
