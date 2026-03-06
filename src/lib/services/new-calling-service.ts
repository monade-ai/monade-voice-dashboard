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

  // Prepare the payload for our proxy API
  const payload = {
    phone_number: params.phone_number,
    callee_info: params.callee_info || {},
    assistant_id: params.assistant_id,
    trunk_name: params.trunk_name, // 'twilio' or 'vobiz'
    ...(params.api_key ? { api_key: params.api_key } : {}),
    user_uid: params.user_uid, // User UID for trunk ownership validation
    use_case: params.use_case,
    prompt_url: params.prompt_url,
    knowledge_base_url: params.knowledge_base_url,
    knowledge_base_id: params.knowledge_base_id,
    use_case_prompt_map: params.use_case_prompt_map,
  };

  console.log('[NewCallingService] SENDING POST to /api/voice-agents/outbound-call with body:', JSON.stringify({
    ...payload,
    api_key: params.api_key ? `${params.api_key.substring(0, 20)}...` : 'SERVER_SIDE',
  }));

  return fetchJson('/api/voice-agents/outbound-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    timeoutMs: 30000,
    retry: { retries: 0 },
  });
}
