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
  api_key: string; // User's API key for billing/transcripts
}

export async function initiateNewCall(params: NewCallingParams): Promise<unknown> {
  console.log('[NewCallingService] initiateNewCall called with params:', {
    ...params,
    api_key: params.api_key ? `${params.api_key.substring(0, 20)}...` : 'NOT PROVIDED',
  });

  if (!params.api_key) {
    throw new Error('API key is required for billing. Please ensure you have an API key configured.');
  }

  if (!params.trunk_name) {
    throw new Error('Please select a trunk (Twilio or Vobiz) to make the call.');
  }

  // Prepare the payload for our proxy API
  const payload = {
    phone_number: params.phone_number,
    callee_info: params.callee_info || {},
    assistant_id: params.assistant_id,
    trunk_name: params.trunk_name, // 'twilio' or 'vobiz'
    api_key: params.api_key, // User's API key for billing
  };

  console.log('[NewCallingService] SENDING POST to /api/calling with body:', JSON.stringify({
    ...payload,
    api_key: `${payload.api_key.substring(0, 20)}...`,
  }));

  return fetchJson('/api/calling', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    timeoutMs: 30000,
    retry: { retries: 0 },
  });
}
