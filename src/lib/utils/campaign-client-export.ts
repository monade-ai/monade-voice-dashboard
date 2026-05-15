import { CampaignContact } from '@/types/campaign.types';

export const MAX_EXPORT_ATTEMPTS = 6;

export type ClientAttemptTag = 'Qualified' | 'Not Interested' | 'Did not pick-up' | 'Uncertain';

export interface CampaignAnalyticsExportRecord {
  call_id?: string;
  transcript_url?: string;
  enhanced_transcript_url?: string | null;
  phone_number?: string;
  campaign_id?: string | null;
  created_at?: string;
  sip_call_id?: string | null;
  recording_url?: string | null;
  analytics?: Record<string, unknown> | null;
  billing_data?: { call_direction?: string | null } | null;
  provider_call_status?: { direction?: string | null } | null;
}

export interface CampaignCallAttemptExportRow {
  [key: string]: string | Record<string, unknown> | null | undefined;
  export_generated_at_utc: string;
  campaign_id: string;
  contact_id: string;
  phone_number: string;
  contact_name: string;
  contact_status: string;
  attempt_number: string;
  attempt_status: string;
  provider_call_id: string;
  provider_participant_id: string;
  provider_room_name: string;
  provider_dispatch_id: string;
  duration_seconds: string;
  attempt_message: string;
  attempt_timestamp_utc: string;
  attempt_timestamp_local: string;
  assigned_at_utc: string;
  completed_at_utc: string;
  contact_created_at_utc: string;
  contact_updated_at_utc: string;
  transcript_call_id: string;
  transcript_url: string;
  transcript_created_at_utc: string;
  analysis_verdict: string;
  analysis_summary: string;
  analysis_confidence_score: string;
  // Analytics fields read straight off the DB analytics blob — never fabricated.
  call_status: string;
  call_direction: string;
  voicemail: string;
  uncertain_tag: string;
  uncertain_reason: string;
  uncertain_agent_feedback: string;
  not_interested_tag: string;
  not_interested_reason: string;
  transcript_message_count: string;
  transcript_text: string;
  metadata_json: string;
  sip_call_id: string;
  recording_url: string;
  analytics_json: Record<string, unknown> | null;
}

export interface ClientCampaignExportResult {
  rows: Record<string, string>[];
  fields: string[];
  totalCalls: number;
  availableRecordings: number;
}

const CLIENT_LEAD_ID_ALIASES = new Set([
  'client lead id',
  'unique lead id',
  'lead id',
  'external id',
  'crm id',
  'id',
]);

const NORMALIZED_NO_PICKUP_STATUSES = new Set([
  'no-answer',
  'no answer',
  'no_answer',
  'busy',
  'not_started',
  'not started',
]);

// Canonical analytics.call_status vocabulary — see src/app/hooks/use-analytics.ts.
// 'picked_up' = call connected (the team's "completed" in the bug report).
const CALL_STATUS_PICKED_UP = 'picked_up';
const CALL_STATUS_NOT_PICKED_UP = 'not_picked_up';

function normalizeCallStatus(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function isVoicemailRow(callStatus: string, voicemailFlag: string): boolean {
  return callStatus === CALL_STATUS_PICKED_UP && voicemailFlag.trim().toLowerCase() === 'true';
}

function isCompletedConversation(callStatus: string, voicemailFlag: string): boolean {
  return callStatus === CALL_STATUS_PICKED_UP && !isVoicemailRow(callStatus, voicemailFlag);
}

function normalizeKey(key: string): string {
  return key.trim().replace(/[\s_.-]+/g, ' ').toLowerCase();
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return JSON.stringify(value);
}

function safeJsonParse(value: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function getAttemptCallId(row: CampaignCallAttemptExportRow): string {
  return row.transcript_call_id || row.provider_call_id || '';
}

function hasDistinctAttemptCallId(row: CampaignCallAttemptExportRow): boolean {
  return getAttemptCallId(row).trim().length > 0;
}

export function extractClientLeadId(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return '';

  for (const [key, value] of Object.entries(metadata)) {
    if (!CLIENT_LEAD_ID_ALIASES.has(normalizeKey(key))) continue;
    const normalized = normalizeValue(value).trim();
    if (normalized) return normalized;
  }

  return '';
}

export function extractClientLeadIdFromMetadataJson(metadataJson: string): string {
  return extractClientLeadId(safeJsonParse(metadataJson));
}

export function flattenAnalyticsObject(
  analytics: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [key, value] of Object.entries(analytics)) {
    const field = prefix ? `${prefix}.${key}` : key;

    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && !(value instanceof Date)
    ) {
      Object.assign(flattened, flattenAnalyticsObject(value as Record<string, unknown>, field));
    } else {
      flattened[field] = normalizeValue(value);
    }
  }

  return flattened;
}

type AttemptTagInput = Pick<CampaignCallAttemptExportRow,
  'analysis_verdict' | 'attempt_status' | 'transcript_text' | 'transcript_url'
  | 'transcript_message_count' | 'duration_seconds' | 'attempt_number' | 'analytics_json'
> & Partial<Pick<CampaignCallAttemptExportRow, 'call_status' | 'voicemail'>>;

// Tagging rules (Rule 2 from the export bug spec):
//   call_status = 'not_picked_up'           → 'Did not pick-up'
//   call_status = 'picked_up' & voicemail   → 'Did not pick-up' (Voicemail surfaces in Attempt_N_Tag as 'Voicemail' downstream;
//                                              we don't have a 'Voicemail' tag in ClientAttemptTag, but it isn't a connected
//                                              conversation — treat as not picked up so verdict columns stay blank)
//   call_status = 'picked_up' (true convo)  → derive from verdict
//   call_status missing                     → conservative legacy heuristic (transcript/status driven), never invents 'Uncertain'
export function mapAttemptTag(row: AttemptTagInput): ClientAttemptTag {
  const verdict = String(row.analysis_verdict || '').trim().toLowerCase();
  const callStatus = normalizeCallStatus(row.call_status ?? row.analytics_json?.call_status as string | undefined);
  const voicemailFlag = String(
    row.voicemail ?? (row.analytics_json?.voicemail as boolean | string | undefined) ?? '',
  );

  if (callStatus === CALL_STATUS_NOT_PICKED_UP) return 'Did not pick-up';
  if (isVoicemailRow(callStatus, voicemailFlag)) return 'Did not pick-up';

  if (callStatus === CALL_STATUS_PICKED_UP) {
    if (verdict === 'qualified' || verdict === 'interested' || verdict === 'likely_to_book') return 'Qualified';
    if (verdict === 'not_interested') return 'Not Interested';
    if (verdict === 'uncertain' || verdict === 'callback' || verdict === 'call_disconnected') return 'Uncertain';
    // Connected call with no/unknown verdict — surface as Uncertain so the row isn't silently dropped.
    return 'Uncertain';
  }

  // Fallback path: analytics.call_status absent (older records). Use the prior heuristic
  // but never override an explicit not-connected signal.
  const status = String(row.attempt_status || '').trim().toLowerCase();
  const callQuality = String(row.analytics_json?.call_quality ?? '').trim().toLowerCase();
  const explicitConnected = row.analytics_json?.call_connected;
  const hasTranscript = Boolean(
    row.transcript_text
    || row.transcript_url
    || (Number(row.transcript_message_count) > 0),
  );
  const hasDuration = Number(row.duration_seconds) > 0;

  if (explicitConnected === false || explicitConnected === 0 || explicitConnected === 'false') {
    return 'Did not pick-up';
  }

  if (verdict === 'qualified' || verdict === 'interested' || verdict === 'likely_to_book') return 'Qualified';
  if (verdict === 'not_interested') return 'Not Interested';

  if (
    row.attempt_number === '0'
    || NORMALIZED_NO_PICKUP_STATUSES.has(status)
    || (status === 'failed' && !hasTranscript && !hasDuration)
  ) {
    return 'Did not pick-up';
  }

  if (
    verdict === 'call_disconnected'
    || ((status.includes('hangup') || status.includes('disconnect')) && hasTranscript)
    || ((callQuality === 'voicemail' || callQuality === 'no_response' || callQuality === 'no response') && hasTranscript)
  ) {
    return 'Uncertain';
  }

  return hasTranscript || hasDuration ? 'Uncertain' : 'Did not pick-up';
}

type CallConnectedInput = Pick<CampaignCallAttemptExportRow,
  'attempt_status' | 'transcript_text' | 'transcript_url' | 'transcript_message_count'
  | 'duration_seconds' | 'attempt_message' | 'analytics_json'
> & Partial<Pick<CampaignCallAttemptExportRow, 'call_status' | 'voicemail'>>;

// Call_Connected derivation (Rule 2):
//   not_picked_up        → 'false'
//   picked_up + voicemail → 'false'
//   picked_up (real conv) → 'true'
//   call_status missing  → fall back to explicit analytics.call_connected, then heuristic.
export function deriveCallConnected(
  row: CallConnectedInput,
  mappedTag?: ClientAttemptTag,
): string {
  const callStatus = normalizeCallStatus(row.call_status ?? row.analytics_json?.call_status as string | undefined);
  const voicemailFlag = String(
    row.voicemail ?? (row.analytics_json?.voicemail as boolean | string | undefined) ?? '',
  );

  if (callStatus === CALL_STATUS_NOT_PICKED_UP) return 'false';
  if (isVoicemailRow(callStatus, voicemailFlag)) return 'false';
  if (callStatus === CALL_STATUS_PICKED_UP) return 'true';

  // Legacy fallback for rows that pre-date call_status.
  const explicit = row.analytics_json?.call_connected;
  if (typeof explicit === 'boolean') return explicit ? 'true' : 'false';
  if (typeof explicit === 'number') return explicit > 0 ? 'true' : 'false';
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();

  if (mappedTag === 'Did not pick-up') return 'false';

  if (
    row.transcript_text
    || row.transcript_url
    || Number(row.transcript_message_count) > 0
    || Number(row.duration_seconds) > 0
    || row.attempt_message
  ) {
    return 'true';
  }

  return '';
}

function isConnectedAttempt(
  row: CallConnectedInput & Pick<CampaignCallAttemptExportRow, 'analysis_verdict' | 'attempt_number'>,
  mappedTag?: ClientAttemptTag,
): boolean {
  return deriveCallConnected(row, mappedTag).toLowerCase() === 'true';
}

export function buildClientCampaignExport(
  attemptRows: CampaignCallAttemptExportRow[],
): ClientCampaignExportResult {
  const grouped = new Map<string, CampaignCallAttemptExportRow[]>();

  for (const row of attemptRows) {
    const bucket = grouped.get(row.contact_id) ?? [];
    bucket.push(row);
    grouped.set(row.contact_id, bucket);
  }

  const dynamicAnalyticsFields = new Set<string>();
  const fixedAttemptFields: string[] = [];

  for (let attempt = 1; attempt <= MAX_EXPORT_ATTEMPTS; attempt += 1) {
    fixedAttemptFields.push(
      `Attempt_${attempt}_Call_ID`,
      `Attempt_${attempt}_Tag`,
      `Attempt_${attempt}_Call_Connected`,
    );
  }

  const outputRows: Record<string, string>[] = [];
  let totalCalls = 0;
  let availableRecordings = 0;

  for (const attempts of grouped.values()) {
    const allSortedAttempts = [...attempts].sort((a, b) => {
      const aNumber = Number(a.attempt_number);
      const bNumber = Number(b.attempt_number);
      if (aNumber !== bNumber) return aNumber - bNumber;

      return String(a.attempt_timestamp_utc).localeCompare(String(b.attempt_timestamp_utc));
    });
    const uniqueAttemptsByCallId: CampaignCallAttemptExportRow[] = [];
    const seenAttemptCallIds = new Set<string>();

    allSortedAttempts.forEach((attempt) => {
      const callId = getAttemptCallId(attempt).trim();
      if (!callId || seenAttemptCallIds.has(callId)) return;
      seenAttemptCallIds.add(callId);
      uniqueAttemptsByCallId.push(attempt);
    });

    const sortedAttempts = uniqueAttemptsByCallId.slice(0, MAX_EXPORT_ATTEMPTS);

    const lead = sortedAttempts[0] ?? allSortedAttempts[0];
    if (!lead) continue;

    const callIds = uniqueAttemptsByCallId
      .map(getAttemptCallId)
      .filter(Boolean);
    const uniqueCallIds = Array.from(new Set(callIds));
    totalCalls += uniqueCallIds.length;
    availableRecordings += uniqueAttemptsByCallId.filter((attempt) => hasDistinctAttemptCallId(attempt) && Boolean(attempt.recording_url)).length;

    const primaryTranscriptAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Qualified' && attempt.transcript_text)
      ?? sortedAttempts.find((attempt) => attempt.transcript_text)
      ?? sortedAttempts[0]
      ?? lead;
    const primaryRecordingAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Qualified' && attempt.recording_url)
      ?? sortedAttempts.find((attempt) => attempt.recording_url)
      ?? sortedAttempts[0]
      ?? lead;
    // Summary-column rule: find the LAST attempt where Call_Connected = TRUE.
    // Its verdict alone decides which of the three column groups gets populated;
    // the other two stay blank. Enforces mutual exclusivity (a lead can never
    // appear in both Qualified and Uncertain summary columns).
    const lastConnectedAttempt = [...sortedAttempts].reverse().find((attempt) => {
      return isConnectedAttempt(attempt, mapAttemptTag(attempt));
    });
    const lastConnectedTag = lastConnectedAttempt ? mapAttemptTag(lastConnectedAttempt) : null;

    // Values come straight from the DB analytics fields. Null/blank in DB → blank in CSV.
    // No fallbacks, no regex inference.
    const qualifiedColumn = lastConnectedTag === 'Qualified'
      ? (lastConnectedAttempt?.analysis_confidence_score ?? '')
      : '';
    const notInterestedTag = lastConnectedTag === 'Not Interested'
      ? (lastConnectedAttempt?.not_interested_tag ?? '')
      : '';
    const notInterestedReason = lastConnectedTag === 'Not Interested'
      ? (lastConnectedAttempt?.not_interested_reason ?? '')
      : '';
    const uncertainTag = lastConnectedTag === 'Uncertain'
      ? (lastConnectedAttempt?.uncertain_tag ?? '')
      : '';
    const uncertainReason = lastConnectedTag === 'Uncertain'
      ? (lastConnectedAttempt?.uncertain_reason ?? '')
      : '';
    const uncertainFeedback = lastConnectedTag === 'Uncertain'
      ? (lastConnectedAttempt?.uncertain_agent_feedback ?? '')
      : '';

    const output: Record<string, string> = {
      'Unique Lead ID (yours)': lead.contact_id,
      'Unique Lead ID (client\'s)': extractClientLeadIdFromMetadataJson(lead.metadata_json),
      'Lead Name': lead.contact_name,
      'Phone Number': lead.phone_number,
      Call_Direction: (lastConnectedAttempt ?? lead).call_direction || '',
      All_Call_IDs: uniqueCallIds.join('|'),
      Qualified_confidence: qualifiedColumn,
      Transcript: primaryTranscriptAttempt?.transcript_text ?? '',
      'Call Recording Link': primaryRecordingAttempt?.recording_url || '',
      'Not Interested_Reason': notInterestedReason,
      'Not Interested_Tag': notInterestedTag,
      Uncertain_Reason: uncertainReason,
      Uncertain_Tag: uncertainTag,
      'Uncertain_Feedback for agent': uncertainFeedback,
    };

    sortedAttempts.forEach((attempt, index) => {
      if (!hasDistinctAttemptCallId(attempt)) return;

      const attemptNumber = index + 1;
      const tag = mapAttemptTag(attempt);
      output[`Attempt_${attemptNumber}_Call_ID`] = getAttemptCallId(attempt);
      output[`Attempt_${attemptNumber}_Tag`] = tag;
      output[`Attempt_${attemptNumber}_Call_Connected`] = deriveCallConnected(attempt, tag);

      // Rule 3: gate Attempt_N_Analytics_* columns behind a real connected conversation
      // (call_status='picked_up' AND not voicemail). Voicemail and not_picked_up rows must
      // not leak analytics fields. The verdict (Qualified/Uncertain/Not Interested) does NOT
      // gate this — every connected, completed attempt gets its analytics blob written so
      // the client can see why a call was tagged the way it was.
      const callStatus = normalizeCallStatus(attempt.call_status ?? attempt.analytics_json?.call_status as string | undefined);
      const voicemailFlag = String(
        attempt.voicemail ?? (attempt.analytics_json?.voicemail as boolean | string | undefined) ?? '',
      );
      const isCompleted = isCompletedConversation(callStatus, voicemailFlag);

      if (attempt.analytics_json && isCompleted) {
        output[`Attempt_${attemptNumber}_Analytics_JSON`] = JSON.stringify(attempt.analytics_json);
        dynamicAnalyticsFields.add(`Attempt_${attemptNumber}_Analytics_JSON`);

        const flattened = flattenAnalyticsObject(attempt.analytics_json);
        for (const [key, value] of Object.entries(flattened)) {
          const field = `Attempt_${attemptNumber}_Analytics_${key}`;
          output[field] = value;
          dynamicAnalyticsFields.add(field);
        }
      }
    });

    outputRows.push(output);
  }

  const fixedLeadFields = [
    'Unique Lead ID (yours)',
    'Unique Lead ID (client\'s)',
    'Lead Name',
    'Phone Number',
    'Call_Direction',
    'All_Call_IDs',
    'Qualified_confidence',
    'Transcript',
    'Call Recording Link',
  ];
  const enrichmentFields = [
    'Not Interested_Reason',
    'Not Interested_Tag',
    'Uncertain_Reason',
    'Uncertain_Tag',
    'Uncertain_Feedback for agent',
  ];

  return {
    rows: outputRows,
    fields: [
      ...fixedLeadFields,
      ...fixedAttemptFields,
      ...Array.from(dynamicAnalyticsFields).sort(),
      ...enrichmentFields,
    ],
    totalCalls,
    availableRecordings,
  };
}

export function countContactCallAttempts(contacts: CampaignContact[]): number {
  return contacts.reduce((count, contact) => count + contact.call_attempts.length, 0);
}
