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
  call_status: '',
  voicemail: '',
  uncertain_tag: '',
  uncertain_reason: '',
  uncertain_agent_feedback: '',
  not_interested_tag: '',
  not_interested_reason: '',
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

  test('mapAttemptTag is driven by call_status when present', () => {
    expect(mapAttemptTag(makeAttempt({
      call_status: 'not_picked_up',
      analysis_verdict: '',
    }))).toBe('Did not pick-up');

    expect(mapAttemptTag(makeAttempt({
      call_status: 'picked_up',
      voicemail: 'true',
      analysis_verdict: '',
    }))).toBe('Did not pick-up');

    expect(mapAttemptTag(makeAttempt({
      call_status: 'picked_up',
      analysis_verdict: 'qualified',
    }))).toBe('Qualified');

    expect(mapAttemptTag(makeAttempt({
      call_status: 'picked_up',
      analysis_verdict: 'interested',
    }))).toBe('Qualified');

    expect(mapAttemptTag(makeAttempt({
      call_status: 'picked_up',
      analysis_verdict: 'not_interested',
    }))).toBe('Not Interested');

    expect(mapAttemptTag(makeAttempt({
      call_status: 'picked_up',
      analysis_verdict: 'uncertain',
    }))).toBe('Uncertain');

    expect(mapAttemptTag(makeAttempt({
      call_status: 'picked_up',
      analysis_verdict: '',
    }))).toBe('Uncertain');
  });

  test('mapAttemptTag falls back to legacy heuristic when call_status absent', () => {
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

  test('deriveCallConnected prefers call_status, then analytics.call_connected', () => {
    expect(deriveCallConnected(makeAttempt({
      call_status: 'not_picked_up',
    }))).toBe('false');
    expect(deriveCallConnected(makeAttempt({
      call_status: 'picked_up',
      voicemail: 'true',
    }))).toBe('false');
    expect(deriveCallConnected(makeAttempt({
      call_status: 'picked_up',
    }))).toBe('true');
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
    // Attempts 1-5 are uncertain (call_disconnected, connected). Attempt 6 is the qualified
    // conversation — and it is the LAST connected attempt, so its verdict drives the
    // summary columns (Qualified_confidence) per the last-connected rule.
    // (Attempt 7 exists but gets capped by MAX_EXPORT_ATTEMPTS=6.)
    const attempts = Array.from({ length: 7 }, (_, index) => makeAttempt({
      attempt_number: String(index + 1),
      provider_call_id: `provider_${index + 1}`,
      transcript_call_id: `call_${index + 1}`,
      call_status: index === 5 ? 'picked_up' : '',
      analysis_verdict: index === 5 ? 'interested' : 'call_disconnected',
      analysis_confidence_score: index === 5 ? '87' : '50',
      analytics_json: index === 5 ? {
        call_status: 'picked_up',
        verdict: 'interested',
        confidence_score: 87,
        key_discoveries: { customer_language: 'english' },
      } : { verdict: 'call_disconnected', call_connected: true },
      recording_url: index === 5 ? 'https://recording.example/call.mp3' : '',
    }));

    const result = buildClientCampaignExport(attempts);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].All_Call_IDs).toBe('call_1|call_2|call_3|call_4|call_5|call_6|call_7');
    expect(result.rows[0].Attempt_6_Call_ID).toBe('call_6');
    expect(result.rows[0].Attempt_6_Tag).toBe('Qualified');
    expect(result.rows[0].Attempt_7_Call_ID).toBeUndefined();
    expect(result.rows[0].Qualified_confidence).toBe('87');
    expect(result.rows[0]['Call Recording Link']).toBe('https://recording.example/call.mp3');
    expect(result.fields).toContain('Attempt_6_Analytics_key_discoveries.customer_language');
    expect(result.rows[0]['Attempt_6_Analytics_key_discoveries.customer_language']).toBe('english');
    expect(result.totalCalls).toBe(7);
    expect(result.availableRecordings).toBe(1);
  });

  test('summary columns come from the last connected attempt only (mutual exclusivity)', () => {
    // The team's example: Attempt 1 Qualified TRUE, Attempt 2 Uncertain TRUE, Attempt 3 not picked up.
    // Last connected = Attempt 2 (Uncertain). Only Uncertain_* columns get populated;
    // Qualified_confidence and Not Interested_* MUST stay blank even though Attempt 1 was Qualified.
    const result = buildClientCampaignExport([
      makeAttempt({
        contact_id: 'lead_mixed',
        attempt_number: '1',
        provider_call_id: 'provider_q',
        transcript_call_id: 'AJ_qualifiedAttempt_1',
        call_status: 'picked_up',
        voicemail: 'false',
        analysis_verdict: 'qualified',
        analysis_confidence_score: '88',
      }),
      makeAttempt({
        contact_id: 'lead_mixed',
        attempt_number: '2',
        provider_call_id: 'provider_u',
        transcript_call_id: 'AJ_aHsphstuVBBT',
        call_status: 'picked_up',
        voicemail: 'false',
        analysis_verdict: 'uncertain',
        uncertain_tag: 'Asked to call later',
        uncertain_reason: 'Customer was driving and asked us to call back tomorrow.',
        uncertain_agent_feedback: 'Confirm a callback slot before ending.',
      }),
      makeAttempt({
        contact_id: 'lead_mixed',
        attempt_number: '3',
        provider_call_id: 'provider_np',
        transcript_call_id: 'AJ_notPicked_3',
        call_status: 'not_picked_up',
        voicemail: 'false',
        analysis_verdict: '',
      }),
    ]);

    expect(result.rows).toHaveLength(1);

    // Per-attempt columns reflect each attempt's own state.
    expect(result.rows[0].Attempt_1_Tag).toBe('Qualified');
    expect(result.rows[0].Attempt_1_Call_Connected).toBe('true');
    expect(result.rows[0].Attempt_2_Tag).toBe('Uncertain');
    expect(result.rows[0].Attempt_2_Call_Connected).toBe('true');
    expect(result.rows[0].Attempt_3_Tag).toBe('Did not pick-up');
    expect(result.rows[0].Attempt_3_Call_Connected).toBe('false');

    // Summary columns come from Attempt 2 (last connected) ONLY.
    expect(result.rows[0].Uncertain_Tag).toBe('Asked to call later');
    expect(result.rows[0].Uncertain_Reason).toBe('Customer was driving and asked us to call back tomorrow.');
    expect(result.rows[0]['Uncertain_Feedback for agent']).toBe('Confirm a callback slot before ending.');

    // Qualified and Not Interested groups MUST stay blank — even though Attempt 1 was Qualified.
    expect(result.rows[0].Qualified_confidence).toBe('');
    expect(result.rows[0]['Not Interested_Tag']).toBe('');
    expect(result.rows[0]['Not Interested_Reason']).toBe('');
  });

  test('summary columns stay blank when no attempt was connected', () => {
    // All attempts not_picked_up → no last-connected attempt → every summary column blank.
    const result = buildClientCampaignExport([
      makeAttempt({
        contact_id: 'lead_unanswered',
        attempt_number: '1',
        provider_call_id: 'provider_np_1',
        transcript_call_id: 'call_np_1',
        call_status: 'not_picked_up',
        analysis_verdict: '',
        uncertain_tag: '',
      }),
      makeAttempt({
        contact_id: 'lead_unanswered',
        attempt_number: '2',
        provider_call_id: 'provider_np_2',
        transcript_call_id: 'call_np_2',
        call_status: 'not_picked_up',
        analysis_verdict: '',
        uncertain_tag: '',
      }),
    ]);

    expect(result.rows[0].Qualified_confidence).toBe('');
    expect(result.rows[0]['Not Interested_Tag']).toBe('');
    expect(result.rows[0]['Not Interested_Reason']).toBe('');
    expect(result.rows[0].Uncertain_Tag).toBe('');
    expect(result.rows[0].Uncertain_Reason).toBe('');
    expect(result.rows[0]['Uncertain_Feedback for agent']).toBe('');
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

  test('not_picked_up attempts never invent uncertain enrichment or leak analytics', () => {
    // The bug from the field report: DB has call_status='not_picked_up', verdict=null,
    // uncertain_tag=null, voicemail=false. Export must echo nulls, never fabricate "Voicemail".
    const result = buildClientCampaignExport([
      makeAttempt({
        contact_id: 'contact_unanswered',
        contact_name: 'Unanswered Lead',
        transcript_call_id: 'call_vm_1',
        provider_call_id: 'provider_vm_1',
        call_status: 'not_picked_up',
        voicemail: 'false',
        analysis_verdict: '',
        uncertain_tag: '',
        uncertain_reason: '',
        uncertain_agent_feedback: '',
        transcript_text: 'Voicemail greeting',
        transcript_url: 'https://storage.googleapis.com/vm.jsonl',
        analytics_json: {
          call_status: 'not_picked_up',
          verdict: null,
          voicemail: false,
          uncertain_tag: null,
        },
      }),
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Attempt_1_Tag).toBe('Did not pick-up');
    expect(result.rows[0].Attempt_1_Call_Connected).toBe('false');
    expect(result.rows[0].Uncertain_Tag).toBe('');
    expect(result.rows[0].Uncertain_Reason).toBe('');
    expect(result.rows[0]['Uncertain_Feedback for agent']).toBe('');
    expect(result.rows[0]['Not Interested_Tag']).toBe('');
    expect(result.rows[0]['Not Interested_Reason']).toBe('');
    expect(result.rows[0].Qualified_confidence).toBe('');
    expect(result.rows[0]['Attempt_1_Analytics_verdict']).toBeUndefined();
  });

  test('uncertain DB fields are passed through to CSV unchanged', () => {
    // When the DB *does* have uncertain_tag populated, the export must echo it verbatim
    // (no regex inference, no overrides).
    const result = buildClientCampaignExport([
      makeAttempt({
        contact_id: 'contact_real_uncertain',
        call_status: 'picked_up',
        voicemail: 'false',
        analysis_verdict: 'uncertain',
        uncertain_tag: 'Language barrier',
        uncertain_reason: 'Customer responded in a language the agent did not handle.',
        uncertain_agent_feedback: 'Offer multilingual support next time.',
      }),
    ]);

    expect(result.rows[0].Attempt_1_Tag).toBe('Uncertain');
    expect(result.rows[0].Attempt_1_Call_Connected).toBe('true');
    expect(result.rows[0].Uncertain_Tag).toBe('Language barrier');
    expect(result.rows[0].Uncertain_Reason).toBe('Customer responded in a language the agent did not handle.');
    expect(result.rows[0]['Uncertain_Feedback for agent']).toBe('Offer multilingual support next time.');
  });

  test('qualified verdict populates only Qualified columns, never Uncertain', () => {
    // The "Interested tagged as Uncertain" bug: DB verdict='qualified' must map to
    // Qualified_confidence and leave Uncertain_* / Not Interested_* blank.
    const result = buildClientCampaignExport([
      makeAttempt({
        contact_id: 'contact_qualified',
        call_status: 'picked_up',
        voicemail: 'false',
        analysis_verdict: 'qualified',
        analysis_confidence_score: '92',
        uncertain_tag: '',
        uncertain_reason: '',
      }),
    ]);

    expect(result.rows[0].Attempt_1_Tag).toBe('Qualified');
    expect(result.rows[0].Qualified_confidence).toBe('92');
    expect(result.rows[0].Uncertain_Tag).toBe('');
    expect(result.rows[0].Uncertain_Reason).toBe('');
    expect(result.rows[0]['Not Interested_Tag']).toBe('');
  });
});
