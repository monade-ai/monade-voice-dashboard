import { NextRequest, NextResponse } from 'next/server';

type MappedTag = 'Not Interested' | 'Uncertain';

interface EnrichmentInput {
  call_id?: string;
  mapped_tag?: MappedTag;
  transcript_text?: string;
  analysis_summary?: string;
  call_connected?: string;
  analytics?: Record<string, unknown>;
}

interface EnrichmentOutput {
  call_id: string;
  not_interested_reason?: string;
  not_interested_tag?: string;
  uncertain_reason?: string;
  uncertain_tag?: string;
  uncertain_feedback_for_agent?: string;
}

const NOT_INTERESTED_PATTERNS: Array<[RegExp, string, string]> = [
  [/price|cost|expensive|budget|fees/i, 'Budget/price', 'Customer objected to pricing or budget fit.'],
  [/already|using|competitor|solution/i, 'Already has solution', 'Customer indicated they already have another solution.'],
  [/not interested|do not need|no requirement|no need/i, 'No requirement', 'Customer did not express a current requirement.'],
  [/later|busy|not now|timing/i, 'Timing issue', 'Customer timing was not suitable.'],
  [/decision|manager|owner|authority/i, 'Not decision maker', 'Customer may not be the decision maker.'],
];

const UNCERTAIN_PATTERNS: Array<[RegExp, string, string]> = [
  [/voicemail|voice mail|beep/i, 'Voicemail', 'Call reached voicemail or a recorded prompt.'],
  [/language|hindi|english|tamil|telugu|kannada|malayalam|marathi|gujarati/i, 'Language barrier', 'Conversation suggests a possible language mismatch.'],
  [/disconnect|disconnected|hangup|hung up|cut/i, 'Disconnected on hearing reason', 'Call disconnected before a clear outcome was reached.'],
  [/later|callback|call back|busy/i, 'Asked to call later', 'Customer deferred the conversation.'],
];

function combinedText(input: EnrichmentInput): string {
  return [
    input.analysis_summary,
    input.transcript_text,
    JSON.stringify(input.analytics ?? {}),
  ].filter(Boolean).join('\n');
}

function classifyNotInterested(input: EnrichmentInput): EnrichmentOutput {
  const text = combinedText(input);
  const matched = NOT_INTERESTED_PATTERNS.find(([pattern]) => pattern.test(text));

  return {
    call_id: String(input.call_id),
    not_interested_tag: matched?.[1] ?? 'Other',
    not_interested_reason: matched?.[2] ?? (input.analysis_summary || 'Customer was not interested.'),
  };
}

function classifyUncertain(input: EnrichmentInput): EnrichmentOutput {
  const text = combinedText(input);
  const matched = UNCERTAIN_PATTERNS.find(([pattern]) => pattern.test(text));

  return {
    call_id: String(input.call_id),
    uncertain_tag: matched?.[1] ?? 'Other',
    uncertain_reason: matched?.[2] ?? (input.analysis_summary || 'The call did not produce a clear qualification outcome.'),
    uncertain_feedback_for_agent: 'Clarify the reason for the call early, confirm whether the customer can continue, and ask one direct qualifying question before ending.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const calls = Array.isArray(body?.calls) ? body.calls as EnrichmentInput[] : [];

    const enrichments: Record<string, Omit<EnrichmentOutput, 'call_id'>> = {};

    for (const call of calls) {
      if (!call.call_id) continue;
      if (call.mapped_tag !== 'Not Interested' && call.mapped_tag !== 'Uncertain') continue;

      const result = call.mapped_tag === 'Not Interested'
        ? classifyNotInterested(call)
        : classifyUncertain(call);
      const { call_id, ...rest } = result;
      enrichments[call_id] = rest;
    }

    return NextResponse.json({ enrichments }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[CampaignExportEnrich] Error:', error);

    return NextResponse.json(
      { error: 'Failed to enrich campaign export calls' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
