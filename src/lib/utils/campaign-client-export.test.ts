import {
  buildClientCampaignExport,
  deriveCallConnected,
  extractClientLeadId,
  flattenAnalyticsObject,
  mapAttemptTag,
  CampaignCallAttemptExportRow,
} from '@/lib/utils/campaign-client-export';

const makeAttempt = (overrides: Partial<CampaignCallAttemptExportRow> = {}): CampaignCallAttemptExportRow => ({
  export_generated_at_utc: '2026-01-01T00:00:00.000Z',
  campaign_id: 'campaign_1',
  contact_id: 'contact_1',
  phone_number: '+919000000000',
  contact_name: 'Lead One',
  contact_status: 'completed',
  attempt_number: '1',
  attempt_status: 'hangup',
  provider_call_id: 'provider_1',
  provider_participant_id: '',
  provider_room_name: '',
  provider_dispatch_id: '',
  duration_seconds: '30',
  attempt_message: '',
  attempt_timestamp_utc: '2026-01-01T00:00:00.000Z',
  attempt_timestamp_local: '2026-01-01 05:30:00',
  assigned_at_utc: '',
  completed_at_utc: '',
  contact_created_at_utc: '',
  contact_updated_at_utc: '',
  transcript_call_id: 'call_1',
  transcript_url: 'https://storage.googleapis.com/bucket/transcript.jsonl',
  transcript_created_at_utc: '',
  analysis_verdict: 'call_disconnected',
  analysis_summary: 'Summary',
  analysis_confidence_score: '50',
  transcript_message_count: '3',
  transcript_text: 'Agent: hello\nUser: hi',
  metadata_json: JSON.stringify({ client_lead_id: 'CLIENT-1', name: 'Lead One' }),
  sip_call_id: 'sip_1',
  recording_url: '',
  analytics_json: {
    verdict: 'call_disconnected',
    call_quality: 'completed',
    confidence_score: 50,
  },
  ...overrides,
});

describe('campaign-client-export', () => {
  test('extractClientLeadId resolves supported aliases', () => {
    expect(extractClientLeadId({ external_id: 'EXT-1' })).toBe('EXT-1');
    expect(extractClientLeadId({ 'Unique Lead ID': 'LEAD-2' })).toBe('LEAD-2');
    expect(extractClientLeadId({ name: 'No ID' })).toBe('');
  });

  test('mapAttemptTag applies deterministic taxonomy', () => {
    expect(mapAttemptTag(makeAttempt({ analysis_verdict: 'interested' }))).toBe('Qualified');
    expect(mapAttemptTag(makeAttempt({ analysis_verdict: 'likely_to_book' }))).toBe('Qualified');
    expect(mapAttemptTag(makeAttempt({ analysis_verdict: 'not_interested' }))).toBe('Not Interested');
    expect(mapAttemptTag(makeAttempt({
      analytics_json: { call_connected: false, call_quality: 'voicemail' },
      transcript_text: 'Voicemail prompt',
      transcript_url: 'https://storage.googleapis.com/test',
    }))).toBe('Did not pick-up');
    expect(mapAttemptTag(makeAttempt({
      attempt_number: '0',
      attempt_status: 'not_started',
      analysis_verdict: '',
      transcript_url: '',
      transcript_text: '',
      transcript_message_count: '',
      duration_seconds: '',
    }))).toBe('Did not pick-up');
    expect(mapAttemptTag(makeAttempt({ analysis_verdict: 'call_disconnected' }))).toBe('Uncertain');
  });

  test('deriveCallConnected prefers analytics.call_connected and infers conservatively', () => {
    expect(deriveCallConnected(makeAttempt({
      analytics_json: { call_connected: false },
    }))).toBe('false');
    expect(deriveCallConnected(makeAttempt({
      analytics_json: { call_connected: true },
    }))).toBe('true');
    expect(deriveCallConnected(makeAttempt({
      transcript_text: '',
      transcript_url: '',
      transcript_message_count: '',
      duration_seconds: '',
      attempt_message: '',
      analytics_json: {},
    }), 'Did not pick-up')).toBe('false');
  });

  test('flattenAnalyticsObject handles changed nested analytics fields', () => {
    expect(flattenAnalyticsObject({
      verdict: 'interested',
      key_discoveries: {
        customer_language: 'english',
        objections_raised: ['price'],
      },
    })).toEqual({
      verdict: 'interested',
      'key_discoveries.customer_language': 'english',
      'key_discoveries.objections_raised': '["price"]',
    });
  });

  test('buildClientCampaignExport pivots to one row and caps attempts at six', () => {
    const attempts = Array.from({ length: 7 }, (_, index) => makeAttempt({
      attempt_number: String(index + 1),
      provider_call_id: `provider_${index + 1}`,
      transcript_call_id: `call_${index + 1}`,
      analysis_verdict: index === 1 ? 'interested' : 'call_disconnected',
      analysis_confidence_score: index === 1 ? '87' : '50',
      analytics_json: index === 1 ? {
        verdict: 'interested',
        confidence_score: 87,
        key_discoveries: { customer_language: 'english' },
      } : { verdict: 'call_disconnected', call_connected: true },
      recording_url: index === 1 ? 'https://recording.example/call.mp3' : '',
    }));

    const result = buildClientCampaignExport(attempts);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].All_Call_IDs).toBe('call_1|call_2|call_3|call_4|call_5|call_6|call_7');
    expect(result.rows[0].Attempt_6_Call_ID).toBe('call_6');
    expect(result.rows[0].Attempt_6_Tag).toBe('Uncertain');
    expect(result.rows[0].Attempt_7_Call_ID).toBeUndefined();
    expect(result.rows[0].Qualified_confidence).toBe('87');
    expect(result.rows[0]['Call Recording Link']).toBe('https://recording.example/call.mp3');
    expect(result.fields).toContain('Attempt_2_Analytics_key_discoveries.customer_language');
    expect(result.rows[0]['Attempt_2_Analytics_key_discoveries.customer_language']).toBe('english');
    expect(result.totalCalls).toBe(7);
    expect(result.availableRecordings).toBe(1);
  });

  test('buildClientCampaignExport skips duplicate or empty follow-up attempt slots', () => {
    const duplicateAttempt = makeAttempt({
      contact_id: 'contact_dupe',
      contact_name: 'Duplicate Lead',
      transcript_call_id: '',
      provider_call_id: '',
      analysis_verdict: 'call_disconnected',
      transcript_text: '',
      transcript_url: '',
      transcript_message_count: '',
      duration_seconds: '',
      analytics_json: null,
    });
    const realAttempt = makeAttempt({
      contact_id: 'contact_dupe',
      contact_name: 'Duplicate Lead',
      transcript_call_id: 'call_real_1',
      provider_call_id: 'provider_real_1',
      analysis_verdict: 'call_disconnected',
    });

    const result = buildClientCampaignExport([realAttempt, duplicateAttempt]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Attempt_1_Call_ID).toBe('call_real_1');
    expect(result.rows[0].Attempt_1_Tag).toBe('Uncertain');
    expect(result.rows[0].Attempt_2_Call_ID).toBeUndefined();
    expect(result.rows[0].Attempt_2_Tag).toBeUndefined();
    expect(result.rows[0].Attempt_2_Call_Connected).toBeUndefined();
    expect(result.rows[0].All_Call_IDs).toBe('call_real_1');
    expect(result.totalCalls).toBe(1);
  });

  test('unanswered calls do not populate uncertain enrichment or analytics verdict fields', () => {
    const result = buildClientCampaignExport([
      makeAttempt({
        contact_id: 'contact_unanswered',
        contact_name: 'Unanswered Lead',
        transcript_call_id: 'call_vm_1',
        provider_call_id: 'provider_vm_1',
        transcript_text: 'Voicemail greeting',
        transcript_url: 'https://storage.googleapis.com/vm.jsonl',
        analytics_json: {
          call_connected: false,
          call_quality: 'voicemail',
          verdict: 'call_disconnected',
        },
      }),
    ], {
      call_vm_1: {
        uncertain_tag: 'Voicemail',
        uncertain_reason: 'Call reached voicemail or a recorded prompt.',
        uncertain_feedback_for_agent: 'Should not appear',
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Attempt_1_Tag).toBe('Did not pick-up');
    expect(result.rows[0].Attempt_1_Call_Connected).toBe('false');
    expect(result.rows[0].Uncertain_Tag).toBe('');
    expect(result.rows[0].Uncertain_Reason).toBe('');
    expect(result.rows[0]['Uncertain_Feedback for agent']).toBe('');
    expect(result.rows[0]['Attempt_1_Analytics_verdict']).toBeUndefined();
    expect(result.rows[0].Qualified_confidence).toBe('');
  });
});
