/**
 * Call outcome derivation from `provider_call_status`.
 *
 * !!! VOBIZ-SPECIFIC !!!
 * The status vocabulary ("completed" / "no-answer" / "busy" / "failed") and
 * the hangup_cause strings (NORMAL_CLEARING, USER_BUSY, MEDIA_TIMEOUT, …) below
 * are emitted by Vobiz. If we ever swap telephony providers (Twilio, Plivo,
 * Exotel, etc.), this whole file needs revisiting:
 *   - the `status` strings will differ ("completed" → "answered" on most other carriers),
 *   - hangup_cause will use a different shorthand (Q.850 codes, SIP response codes, etc.),
 *   - some causes won't exist and others will need to be added.
 * Update FAILURE_REASONS and deriveCallOutcome() — keep the four output buckets
 * (picked_up / not_picked_up / busy / failed) so consumers don't have to change.
 *
 * Reference: docs/USEFUL_mapping.md
 */

import type { ProviderCallStatus } from '@/app/hooks/use-analytics';

export type CallOutcome = 'picked_up' | 'not_picked_up' | 'busy' | 'failed' | 'voicemail' | 'unavailable';

// User-facing translations of Vobiz hangup_cause codes. Non-technical copy on purpose.
export const FAILURE_REASONS: Record<string, string> = {
  USER_BUSY: 'Line was busy',
  NO_ANSWER: 'Did not pick up',
  ORIGINATOR_CANCEL: 'We hung up before they answered',
  CALL_REJECTED: 'They rejected the call',
  REJECTED: 'Call refused by their network',
  INVALID_NUMBER: 'Invalid number',
  UNALLOCATED_NUMBER: 'Number not in service',
  SERVICE_UNAVAILABLE: "Their carrier was unreachable",
  SERVER_ERROR: 'Carrier-side error',
  MEDIA_TIMEOUT: 'Audio dropped mid-call',
  PROTOCOL_ERROR: 'Call setup error',
  NETWORK_OUT_OF_ORDER: 'Network failure',
  DESTINATION_OUT_OF_ORDER: "Their phone system is offline",
  NORMAL_TEMPORARY_FAILURE: 'Temporary failure, worth retrying',
  SWITCH_CONGESTION: 'Carrier was overloaded',
  UNKNOWN: 'Unknown reason',
};

export interface OutcomeChip {
  outcome: CallOutcome;
  label: string;          // user-facing chip text
  reason?: string;        // friendly hangup reason (only set when outcome === 'failed')
  tone: string;           // tailwind text color class
  dot: string;            // tailwind bg color class for the indicator dot
}

const PICKED_UP: Omit<OutcomeChip, 'outcome' | 'reason'> = {
  label: 'Picked Up',
  tone: 'text-green-500',
  dot: 'bg-green-500/80',
};
const NOT_PICKED_UP: Omit<OutcomeChip, 'outcome' | 'reason'> = {
  label: 'Not Picked Up',
  tone: 'text-muted-foreground',
  dot: 'bg-muted-foreground/40',
};
const BUSY: Omit<OutcomeChip, 'outcome' | 'reason'> = {
  label: 'Busy',
  tone: 'text-yellow-500',
  dot: 'bg-yellow-500/80',
};
const FAILED: Omit<OutcomeChip, 'outcome' | 'reason'> = {
  label: 'Failed',
  tone: 'text-red-500',
  dot: 'bg-red-500/80',
};
const VOICEMAIL: Omit<OutcomeChip, 'outcome' | 'reason'> = {
  label: 'Voicemail',
  tone: 'text-blue-500',
  dot: 'bg-blue-500/80',
};
const UNAVAILABLE: Omit<OutcomeChip, 'outcome' | 'reason'> = {
  label: 'Not Available',
  tone: 'text-muted-foreground/60',
  dot: 'bg-muted-foreground/30',
};

export function deriveCallOutcome(status: ProviderCallStatus | null | undefined): OutcomeChip | null {
  if (!status) return null;

  const s = (status.status ?? '').toLowerCase();
  const cause = (status.hangup_cause ?? '').toUpperCase();

  if (s === 'completed') {
    return { outcome: 'picked_up', ...PICKED_UP };
  }
  if (s === 'busy' || cause === 'USER_BUSY') {
    return { outcome: 'busy', ...BUSY };
  }
  if (s === 'no-answer' || cause === 'NO_ANSWER' || cause === 'ORIGINATOR_CANCEL') {
    return { outcome: 'not_picked_up', ...NOT_PICKED_UP };
  }

  return {
    outcome: 'failed',
    ...FAILED,
    reason: FAILURE_REASONS[cause] ?? 'Call failed',
  };
}

interface AnalyticsStatusFallback {
  provider_call_status?: ProviderCallStatus | null;
  call_status?: string | null;
  voicemail?: boolean | null;
}

export function resolveCallOutcome(
  analytics: AnalyticsStatusFallback | string | null | undefined,
): OutcomeChip {
  let parsedAnalytics: AnalyticsStatusFallback | null = null;

  if (typeof analytics === 'string') {
    try {
      parsedAnalytics = JSON.parse(analytics) as AnalyticsStatusFallback;
    } catch {
      parsedAnalytics = null;
    }
  } else if (analytics && typeof analytics === 'object') {
    parsedAnalytics = analytics;
  }

  const providerOutcome = deriveCallOutcome(parsedAnalytics?.provider_call_status);
  if (providerOutcome) return providerOutcome;

  if (parsedAnalytics?.call_status === 'not_picked_up') {
    return { outcome: 'not_picked_up', label: 'Not Answered', tone: 'text-muted-foreground', dot: 'bg-muted-foreground/40' };
  }

  if (parsedAnalytics?.call_status === 'picked_up' && parsedAnalytics?.voicemail === true) {
    return { outcome: 'voicemail', ...VOICEMAIL };
  }

  return { outcome: 'unavailable', ...UNAVAILABLE };
}
