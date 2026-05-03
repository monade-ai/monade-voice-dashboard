import { deriveCallOutcome, resolveCallOutcome } from './call-outcome';

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
