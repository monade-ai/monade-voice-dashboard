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
  enhanced_transcript_url: string;
  transcript_created_at_utc: string;
  analysis_verdict: string;
  analysis_summary: string;
  analysis_confidence_score: string;
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

export interface CampaignExportEnrichment {
  not_interested_reason?: string;
  not_interested_tag?: string;
  uncertain_reason?: string;
  uncertain_tag?: string;
  uncertain_feedback_for_agent?: string;
}

export interface CampaignExportEnrichmentRequest {
  call_id: string;
  mapped_tag: Extract<ClientAttemptTag, 'Not Interested' | 'Uncertain'>;
  transcript_text: string;
  analysis_summary: string;
  call_connected: string;
  analytics: Record<string, unknown>;
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

export function mapAttemptTag(row: Pick<CampaignCallAttemptExportRow,
  'analysis_verdict' | 'attempt_status' | 'transcript_text' | 'transcript_url' | 'transcript_message_count' | 'duration_seconds' | 'attempt_number' | 'analytics_json'
>): ClientAttemptTag {
  const verdict = String(row.analysis_verdict || '').trim().toLowerCase();
  const status = String(row.attempt_status || '').trim().toLowerCase();
  const callQuality = String(row.analytics_json?.call_quality ?? '').trim().toLowerCase();
  const hasTranscript = Boolean(
    row.transcript_text
    || row.transcript_url
    || (Number(row.transcript_message_count) > 0),
  );
  const hasDuration = Number(row.duration_seconds) > 0;

  if (verdict === 'interested' || verdict === 'likely_to_book') return 'Qualified';
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

export function deriveCallConnected(
  row: Pick<CampaignCallAttemptExportRow,
    'attempt_status' | 'transcript_text' | 'transcript_url' | 'transcript_message_count' | 'duration_seconds' | 'attempt_message' | 'analytics_json'
  >,
  mappedTag?: ClientAttemptTag,
): string {
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

export function buildCampaignEnrichmentRequests(
  rows: CampaignCallAttemptExportRow[],
): CampaignExportEnrichmentRequest[] {
  const seen = new Set<string>();
  const requests: CampaignExportEnrichmentRequest[] = [];

  for (const row of rows) {
    const tag = mapAttemptTag(row);
    if (tag !== 'Not Interested' && tag !== 'Uncertain') continue;

    const callConnected = deriveCallConnected(row, tag);
    if (callConnected.toLowerCase() !== 'true') continue;

    const callId = getAttemptCallId(row);
    if (!callId || seen.has(callId)) continue;
    seen.add(callId);

    requests.push({
      call_id: callId,
      mapped_tag: tag,
      transcript_text: row.transcript_text,
      analysis_summary: row.analysis_summary,
      call_connected: callConnected,
      analytics: row.analytics_json ?? {},
    });
  }

  return requests;
}

export function buildClientCampaignExport(
  attemptRows: CampaignCallAttemptExportRow[],
  enrichmentsByCallId: Record<string, CampaignExportEnrichment> = {},
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
    const sortedAttempts = allSortedAttempts.slice(0, MAX_EXPORT_ATTEMPTS);

    const lead = sortedAttempts[0];
    const callIds = allSortedAttempts
      .map(getAttemptCallId)
      .filter(Boolean);
    const uniqueCallIds = Array.from(new Set(callIds));
    const tagsByCallId = new Map<string, ClientAttemptTag>();

    allSortedAttempts.forEach((attempt) => {
      const callId = getAttemptCallId(attempt);
      const tag = mapAttemptTag(attempt);
      if (callId) tagsByCallId.set(callId, tag);
      if (callId) totalCalls += 1;
      if (attempt.recording_url) availableRecordings += 1;
    });

    const primaryTranscriptAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Qualified' && attempt.transcript_text)
      ?? sortedAttempts.find((attempt) => attempt.transcript_text)
      ?? sortedAttempts[0];
    const primaryRecordingAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Qualified' && attempt.recording_url)
      ?? sortedAttempts.find((attempt) => attempt.recording_url)
      ?? sortedAttempts[0];
    const firstQualifiedAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Qualified');
    const firstNotInterestedAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Not Interested');
    const firstUncertainAttempt = sortedAttempts.find((attempt) => mapAttemptTag(attempt) === 'Uncertain');
    const notInterestedEnrichment = firstNotInterestedAttempt
      ? enrichmentsByCallId[getAttemptCallId(firstNotInterestedAttempt)]
      : undefined;
    const uncertainEnrichment = firstUncertainAttempt
      ? enrichmentsByCallId[getAttemptCallId(firstUncertainAttempt)]
      : undefined;

    const output: Record<string, string> = {
      'Unique Lead ID (yours)': lead.contact_id,
      'Unique Lead ID (client\'s)': extractClientLeadIdFromMetadataJson(lead.metadata_json),
      'Lead Name': lead.contact_name,
      'Phone Number': lead.phone_number,
      All_Call_IDs: uniqueCallIds.join('|'),
      Qualified_confidence: firstQualifiedAttempt?.analysis_confidence_score ?? '',
      Transcript: primaryTranscriptAttempt?.transcript_text ?? '',
      'Call Recording Link': primaryRecordingAttempt?.recording_url || '',
      'Not Interested_Reason': notInterestedEnrichment?.not_interested_reason ?? '',
      'Not Interested_Tag': notInterestedEnrichment?.not_interested_tag ?? '',
      Uncertain_Reason: uncertainEnrichment?.uncertain_reason ?? '',
      Uncertain_Tag: uncertainEnrichment?.uncertain_tag ?? '',
      'Uncertain_Feedback for agent': uncertainEnrichment?.uncertain_feedback_for_agent ?? '',
    };

    sortedAttempts.forEach((attempt, index) => {
      const attemptNumber = index + 1;
      const tag = tagsByCallId.get(getAttemptCallId(attempt)) ?? mapAttemptTag(attempt);
      output[`Attempt_${attemptNumber}_Call_ID`] = getAttemptCallId(attempt);
      output[`Attempt_${attemptNumber}_Tag`] = tag;
      output[`Attempt_${attemptNumber}_Call_Connected`] = deriveCallConnected(attempt, tag);

      if (tag === 'Qualified' && attempt.analytics_json) {
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
