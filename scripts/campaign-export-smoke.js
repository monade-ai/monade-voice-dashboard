function mapAttemptTag(row) {
  const verdict = String(row.analysis_verdict || '').trim().toLowerCase();
  const status = String(row.attempt_status || '').trim().toLowerCase();
  const callQuality = String(row.analytics_json?.call_quality ?? '').trim().toLowerCase();
  const hasTranscript = Boolean(
    row.transcript_text
    || row.transcript_url
    || (Number(row.transcript_message_count) > 0)
  );
  const hasDuration = Number(row.duration_seconds) > 0;
  const noPickupStatuses = new Set(['no-answer', 'no answer', 'no_answer', 'busy', 'not_started', 'not started']);

  if (verdict === 'interested' || verdict === 'likely_to_book') return 'Qualified';
  if (verdict === 'not_interested') return 'Not Interested';
  if (row.attempt_number === '0' || noPickupStatuses.has(status) || (status === 'failed' && !hasTranscript && !hasDuration)) {
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

function deriveCallConnected(row, mappedTag) {
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

function getAttemptCallId(row) {
  return row.transcript_call_id || row.provider_call_id || '';
}

function buildClientCampaignExport(attemptRows) {
  const grouped = new Map();

  for (const row of attemptRows) {
    const bucket = grouped.get(row.contact_id) ?? [];
    bucket.push(row);
    grouped.set(row.contact_id, bucket);
  }

  const outputRows = [];

  for (const attempts of grouped.values()) {
    const allSortedAttempts = [...attempts].sort((a, b) => {
      const aNumber = Number(a.attempt_number);
      const bNumber = Number(b.attempt_number);
      if (aNumber !== bNumber) return aNumber - bNumber;
      return String(a.attempt_timestamp_utc).localeCompare(String(b.attempt_timestamp_utc));
    });

    const uniqueAttemptsByCallId = [];
    const seenAttemptCallIds = new Set();

    allSortedAttempts.forEach((attempt) => {
      const callId = getAttemptCallId(attempt).trim();
      if (!callId || seenAttemptCallIds.has(callId)) return;
      seenAttemptCallIds.add(callId);
      uniqueAttemptsByCallId.push(attempt);
    });

    const sortedAttempts = uniqueAttemptsByCallId.slice(0, 6);
    const lead = sortedAttempts[0] ?? allSortedAttempts[0];
    if (!lead) continue;

    const output = {
      lead: lead.contact_name,
      All_Call_IDs: [...new Set(uniqueAttemptsByCallId.map(getAttemptCallId).filter(Boolean))].join('|'),
    };

    sortedAttempts.forEach((attempt, index) => {
      const attemptNumber = index + 1;
      const tag = mapAttemptTag(attempt);
      output[`Attempt_${attemptNumber}_Call_ID`] = getAttemptCallId(attempt);
      output[`Attempt_${attemptNumber}_Tag`] = tag;
      output[`Attempt_${attemptNumber}_Call_Connected`] = deriveCallConnected(attempt, tag);
    });

    outputRows.push(output);
  }

  return outputRows;
}

function makeAttempt(overrides = {}) {
  return {
    contact_id: 'contact_1',
    contact_name: 'Smoke Lead',
    attempt_number: '1',
    attempt_status: 'hangup',
    provider_call_id: 'provider_1',
    transcript_call_id: 'call_1',
    transcript_url: '',
    transcript_text: 'Assistant: hello',
    transcript_message_count: '1',
    duration_seconds: '30',
    attempt_message: '',
    analysis_verdict: 'call_disconnected',
    analytics_json: { verdict: 'call_disconnected', call_connected: true },
    attempt_timestamp_utc: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const scenarios = [
  {
    name: 'single real attempt + empty legacy row',
    rows: [
      makeAttempt(),
      makeAttempt({
        attempt_number: '2',
        provider_call_id: '',
        transcript_call_id: '',
        transcript_url: '',
        transcript_text: '',
        transcript_message_count: '',
        duration_seconds: '',
        analytics_json: null,
        attempt_timestamp_utc: '2026-01-01T00:01:00.000Z',
      }),
    ],
  },
  {
    name: 'single real attempt + duplicated same call id',
    rows: [
      makeAttempt(),
      makeAttempt({
        attempt_number: '2',
        provider_call_id: 'provider_1',
        transcript_call_id: 'call_1',
        attempt_timestamp_utc: '2026-01-01T00:01:00.000Z',
      }),
    ],
  },
  {
    name: 'two distinct real attempts',
    rows: [
      makeAttempt(),
      makeAttempt({
        attempt_number: '2',
        provider_call_id: 'provider_2',
        transcript_call_id: 'call_2',
        attempt_timestamp_utc: '2026-01-01T00:01:00.000Z',
      }),
    ],
  },
];

for (const scenario of scenarios) {
  const [result] = buildClientCampaignExport(scenario.rows);
  console.log(`\nSCENARIO: ${scenario.name}`);
  console.log(JSON.stringify(result, null, 2));
}
