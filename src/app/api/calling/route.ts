import { NextRequest, NextResponse } from 'next/server';

import {
  buildForwardHeaders,
  fetchMonadeProfileFromRequestHeaders,
  getConfigServerBaseUrl,
  getServiceToken,
} from '@/lib/auth/server-auth';

const VOICE_AGENTS_URL = process.env.NEXT_PUBLIC_VOICE_AGENTS_URL || 'https://service.monade.ai/voice_agents';

// Trunk name mapping - map UI selection to actual trunk names registered in backend
const TRUNK_NAME_MAP: Record<string, string> = {
  twilio: 'Twilio',
  vobiz: 'Vobiz-SIP',
};

type UseCasePromptMap = Record<string, string>;

function parseUseCasePromptMap(input: unknown): UseCasePromptMap {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const map: UseCasePromptMap = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (typeof rawValue !== 'string') continue;

    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim();
    if (!key || !value) continue;

    map[key] = value;
  }

  return map;
}

function getEnvUseCasePromptMap(): UseCasePromptMap {
  const raw = process.env.USE_CASE_PROMPT_URL_MAP;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);

    return parseUseCasePromptMap(parsed);
  } catch (error) {
    console.warn('[API /calling] Invalid USE_CASE_PROMPT_URL_MAP JSON:', error);

    return {};
  }
}

async function resolvePromptUrl(
  requestHeaders: Headers,
  params: {
    promptUrl?: string;
    knowledgeBaseUrl?: string;
    knowledgeBaseId?: string;
    useCase?: string;
    requestUseCaseMap?: unknown;
  },
): Promise<string | null> {
  const directPromptUrl = params.promptUrl?.trim();
  if (directPromptUrl) return directPromptUrl;

  const directKnowledgeBaseUrl = params.knowledgeBaseUrl?.trim();
  if (directKnowledgeBaseUrl) return directKnowledgeBaseUrl;

  const knowledgeBaseId = params.knowledgeBaseId?.trim();
  if (knowledgeBaseId) {
    try {
      const kbResponse = await fetch(
        `${getConfigServerBaseUrl()}/api/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
        {
          method: 'GET',
          headers: buildForwardHeaders(requestHeaders),
          cache: 'no-store',
        },
      );

      if (kbResponse.ok) {
        const kbData = await kbResponse.json() as { url?: string };
        const kbUrl = kbData.url?.trim();
        if (kbUrl) return kbUrl;
      } else {
        console.warn(
          '[API /calling] Could not resolve knowledge base id:',
          knowledgeBaseId,
          kbResponse.status,
        );
      }
    } catch (error) {
      console.warn('[API /calling] Error resolving knowledge base id:', knowledgeBaseId, error);
    }
  }

  const useCase = params.useCase?.trim().toLowerCase();
  if (!useCase) return null;

  const requestMap = parseUseCasePromptMap(params.requestUseCaseMap);
  const envMap = getEnvUseCasePromptMap();
  const mapped = requestMap[useCase] || envMap[useCase];

  return mapped || null;
}

export async function POST(request: NextRequest) {
  try {
    const profile = await fetchMonadeProfileFromRequestHeaders(request.headers);
    if (!profile?.user_uid) {
      return NextResponse.json({ error: 'User is not authenticated.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      phone_number,
      callee_info,
      assistant_id,
      trunk_name,
      user_uid,
      use_case,
      prompt_url,
      knowledge_base_url,
      knowledge_base_id,
      use_case_prompt_map,
    } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!assistant_id) {
      return NextResponse.json({ error: 'Assistant ID is required' }, { status: 400 });
    }

    if (user_uid && user_uid !== profile.user_uid) {
      return NextResponse.json(
        { error: 'Forbidden: user_uid does not match authenticated user.' },
        { status: 403 },
      );
    }

    const resolvedPromptUrl = await resolvePromptUrl(request.headers, {
      promptUrl: prompt_url,
      knowledgeBaseUrl: knowledge_base_url,
      knowledgeBaseId: knowledge_base_id,
      useCase: use_case,
      requestUseCaseMap: use_case_prompt_map,
    });

    // Format target phone number — must already be in E.164 format (+<country><number>)
    let formattedPhone = String(phone_number).trim();
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      return NextResponse.json(
        {
          error:
            'Phone number must include a country code in E.164 format '
            + '(e.g., +91 for India, +1 for US/Canada, +971 for UAE).',
        },
        { status: 400 },
      );
    }

    const resolvedTrunkName = TRUNK_NAME_MAP[String(trunk_name || '').toLowerCase()] || trunk_name || 'Vobiz-SIP';
    const callUrl = `${VOICE_AGENTS_URL}/outbound-call/${encodeURIComponent(formattedPhone)}`;
    const serviceToken = getServiceToken();
    if (!serviceToken) {
      return NextResponse.json(
        { error: 'Server misconfigured: service token is not set.' },
        { status: 500 },
      );
    }

    const metadata: Record<string, unknown> = {
      ...((callee_info && typeof callee_info === 'object') ? callee_info : {}),
    };

    if (use_case && !metadata.use_case) metadata.use_case = use_case;
    if (knowledge_base_id && !metadata.knowledge_base_id) metadata.knowledge_base_id = knowledge_base_id;
    if (resolvedPromptUrl && !metadata.prompt_url) metadata.prompt_url = resolvedPromptUrl;

    const payload: Record<string, unknown> = {
      assistant_id,
      user_uid: profile.user_uid,
      metadata,
      telephony: {
        trunk_name: resolvedTrunkName,
      },
    };

    if (resolvedPromptUrl) {
      payload.prompt_url = resolvedPromptUrl;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    headers['Authorization'] = `Bearer ${serviceToken}`;
    headers['X-API-Key'] = serviceToken;

    const response = await fetch(callUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let errorMessage = 'Failed to initiate call';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: 'Call initiated successfully', raw: responseText };
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('[API /calling] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
