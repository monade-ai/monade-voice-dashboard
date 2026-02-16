import { NextRequest, NextResponse } from 'next/server';

// Voice Agents API for making outbound calls
const VOICE_AGENTS_URL = process.env.NEXT_PUBLIC_VOICE_AGENTS_URL || 'http://35.200.254.189/voice_agents';
const MONADE_API_BASE_URL = process.env.MONADE_API_BASE_URL || 'http://35.200.254.189/db_services';

// Trunk name mapping - map UI selection to actual trunk names registered in backend
const TRUNK_NAME_MAP: Record<string, string> = {
  'twilio': 'Twilio', // Actual registered name
  'vobiz': 'Vobiz-SIP', // Actual registered name
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

async function resolvePromptUrl(params: {
  promptUrl?: string;
  knowledgeBaseUrl?: string;
  knowledgeBaseId?: string;
  useCase?: string;
  requestUseCaseMap?: unknown;
}): Promise<string | null> {
  const directPromptUrl = params.promptUrl?.trim();
  if (directPromptUrl) return directPromptUrl;

  const directKnowledgeBaseUrl = params.knowledgeBaseUrl?.trim();
  if (directKnowledgeBaseUrl) return directKnowledgeBaseUrl;

  const knowledgeBaseId = params.knowledgeBaseId?.trim();
  if (knowledgeBaseId) {
    try {
      const kbResponse = await fetch(
        `${MONADE_API_BASE_URL}/api/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
    const body = await request.json();
    const {
      phone_number, // Target phone number to call
      callee_info, // Metadata about the callee (name, etc.)
      assistant_id, // Assistant ID (required)
      trunk_name, // Selected trunk: 'twilio' or 'vobiz' from UI dropdown
      api_key, // User's API key for billing/transcripts
      user_uid, // User UID for trunk ownership validation
      use_case, // Optional use case key to switch scripts per request
      prompt_url, // Optional direct prompt URL override
      knowledge_base_url, // Optional direct KB URL override
      knowledge_base_id, // Optional KB ID (resolved to URL)
      use_case_prompt_map, // Optional map: { [use_case]: prompt_url }
    } = body;

    const resolvedPromptUrl = await resolvePromptUrl({
      promptUrl: prompt_url,
      knowledgeBaseUrl: knowledge_base_url,
      knowledgeBaseId: knowledge_base_id,
      useCase: use_case,
      requestUseCaseMap: use_case_prompt_map,
    });

    console.log('[API /calling] Received request:', {
      phone_number,
      assistant_id,
      trunk_name,
      user_uid,
      api_key: api_key ? `${api_key.substring(0, 20)}...` : 'NOT PROVIDED',
      callee_info,
      use_case,
      resolved_prompt_url: resolvedPromptUrl || 'assistant_default',
    });

    // Validate required fields
    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 },
      );
    }

    if (!assistant_id) {
      return NextResponse.json(
        { error: 'Assistant ID is required' },
        { status: 400 },
      );
    }

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key is required for billing. Please ensure you have an API key.' },
        { status: 400 },
      );
    }

    if (!user_uid) {
      return NextResponse.json(
        { error: 'user_uid is required to validate trunk ownership.' },
        { status: 400 },
      );
    }

    // Format target phone number
    let formattedPhone = phone_number.trim();
    // Remove any non-digit characters except + at the start
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      // If 10 digits, assume Indian number
      if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    // Map trunk name from UI selection to actual trunk name
    const resolvedTrunkName = TRUNK_NAME_MAP[trunk_name?.toLowerCase()] || trunk_name || 'Vobiz-SIP';

    console.log('[API /calling] Using Voice Agents API with trunk:', resolvedTrunkName);

    // Build the correct API URL and payload per Shashwat's spec
    const callUrl = `${VOICE_AGENTS_URL}/outbound-call/${encodeURIComponent(formattedPhone)}`;

    const metadata: Record<string, unknown> = {
      ...((callee_info && typeof callee_info === 'object') ? callee_info : {}),
    };

    if (use_case && !metadata.use_case) {
      metadata.use_case = use_case;
    }
    if (knowledge_base_id && !metadata.knowledge_base_id) {
      metadata.knowledge_base_id = knowledge_base_id;
    }
    if (resolvedPromptUrl && !metadata.prompt_url) {
      metadata.prompt_url = resolvedPromptUrl;
    }

    const payload: Record<string, unknown> = {
      assistant_id: assistant_id,
      user_uid: user_uid,
      metadata,
      telephony: {
        trunk_name: resolvedTrunkName,
      },
    };
    if (resolvedPromptUrl) {
      payload.prompt_url = resolvedPromptUrl;
    }

    console.log('[API /calling] Calling Voice Agents API:', callUrl);
    console.log('[API /calling] Payload:', JSON.stringify(payload));
    console.log('[API /calling] Using API Key for auth');

    const response = await fetch(callUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': api_key, // User's API key for billing/transcripts
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[API /calling] Voice Agents response:', response.status, responseText);

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
