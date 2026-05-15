import { deriveCallOutcome, resolveCallOutcome, resolveCallDirection } from './call-outcome';

describe('call-outcome', () => {
  test('keeps provider status as highest-priority source', () => {
    expect(resolveCallOutcome({
      provider_call_status: {
        status: 'completed',
        direction: 'outbound',
        source: 'vobiz',
        fetched_at: '2026-05-01T12:13:44.683Z',
        hangup_cause: 'NORMAL_CLEARING',
      },
      call_status: 'not_picked_up',
      voicemail: true,
    })).toMatchObject({
      outcome: 'picked_up',
      label: 'Picked Up',
    });
  });

  test('falls back to analytics call_status for not picked up calls', () => {
    expect(resolveCallOutcome({
      call_status: 'not_picked_up',
    })).toMatchObject({
      outcome: 'not_picked_up',
      label: 'Not Answered',
    });
  });

  test('falls back to voicemail when picked up ended in voicemail', () => {
    expect(resolveCallOutcome({
      call_status: 'picked_up',
      voicemail: true,
    })).toMatchObject({
      outcome: 'voicemail',
      label: 'Voicemail',
    });
  });

  test('supports stringified analytics payloads', () => {
    expect(resolveCallOutcome(JSON.stringify({
      call_status: 'not_picked_up',
    }))).toMatchObject({
      outcome: 'not_picked_up',
      label: 'Not Answered',
    });
  });

  test('gracefully degrades malformed or missing analytics to no entry available', () => {
    expect(resolveCallOutcome('{bad json')).toMatchObject({
      outcome: 'unavailable',
      label: 'Not Available',
    });
    expect(resolveCallOutcome(undefined)).toMatchObject({
      outcome: 'unavailable',
      label: 'Not Available',
    });
  });

  test('provider-only mapper still preserves failure reasons', () => {
    expect(deriveCallOutcome({
      status: 'failed',
      direction: 'outbound',
      source: 'vobiz',
      fetched_at: '2026-05-01T12:13:44.683Z',
      hangup_cause: 'INVALID_NUMBER',
    })).toMatchObject({
      outcome: 'failed',
      label: 'Failed',
      reason: 'Invalid number',
    });
  });
});

describe('resolveCallDirection', () => {
  test('uses billing_data.call_direction when present', () => {
    expect(resolveCallDirection({ billing_data: { call_direction: 'outbound' } })).toBe('outbound');
    expect(resolveCallDirection({ billing_data: { call_direction: 'inbound' } })).toBe('inbound');
  });

  test('falls back to provider_call_status.direction when billing is empty (the loophole)', () => {
    // ~989 prod rows: billing empty, provider knows. Billing-only code mislabeled these.
    expect(resolveCallDirection({
      billing_data: { call_direction: '' },
      provider_call_status: { direction: 'inbound' },
    })).toBe('inbound');
    expect(resolveCallDirection({
      billing_data: null,
      provider_call_status: { direction: 'outbound' },
    })).toBe('outbound');
    expect(resolveCallDirection({
      provider_call_status: { direction: 'inbound' },
    })).toBe('inbound');
  });

  test('on conflict, trusts provider_call_status (carrier CDR wins) per the backend doc', () => {
    // 10 prod rows: billing=inbound but provider=outbound. Provider is ground truth.
    expect(resolveCallDirection({
      billing_data: { call_direction: 'inbound' },
      provider_call_status: { direction: 'outbound' },
    })).toBe('outbound');
  });

  test('returns unknown when neither source resolves', () => {
    expect(resolveCallDirection({})).toBe('unknown');
    expect(resolveCallDirection(null)).toBe('unknown');
    expect(resolveCallDirection(undefined)).toBe('unknown');
    expect(resolveCallDirection({ billing_data: { call_direction: 'unknown' } })).toBe('unknown');
    expect(resolveCallDirection({ billing_data: { call_direction: 'garbage' } })).toBe('unknown');
  });

  test('accepts a JSON string and normalizes casing/whitespace', () => {
    expect(resolveCallDirection('{"billing_data":{"call_direction":"  Inbound "}}')).toBe('inbound');
    expect(resolveCallDirection('not json')).toBe('unknown');
  });
});
