import type { WhatsappFlowStepCondition } from '@/app/hooks/use-whatsapp-flows';

/**
 * The first-24h cadence, as configurable slots.
 *
 * A qualification bucket no longer maps to one template. It maps to an ordered
 * sequence: the first touch is the post-call follow-up, the rest are the ladder
 * reminders. These presets mirror the escalation matrix the backend selects on,
 * so the keys must match exactly.
 */
export interface CadenceSlot {
  key: string;
  label: string;
  hint: string;
  condition?: WhatsappFlowStepCondition;
}

/** No call ever connected. */
const N_TRACK: CadenceSlot[] = [
  { key: 'N1', label: 'Touch 1', hint: 'After call 1 was missed' },
  { key: 'N2', label: 'Touch 2', hint: 'After call 2 was missed' },
  { key: 'N3', label: 'Touch 3', hint: 'Evening window over, still zero connects' },
];

/** At least one call connected but eligibility stayed unconfirmed. */
const U_TRACK: CadenceSlot[] = [
  { key: 'U1', label: 'Touch 1', hint: 'Call connected but was left incomplete' },
  { key: 'U2a', label: 'Touch 2 (missed)', hint: 'Follow-up call was missed', condition: 'missed' },
  { key: 'U2b', label: 'Touch 2 (connected)', hint: 'Connected again, still unconfirmed', condition: 'connected' },
  { key: 'U3', label: 'Touch 3', hint: 'Any uncertain path, still unconfirmed' },
];

/** Qualified on a call: one message, then the ladder stops. */
const QUALIFIED_TRACK: CadenceSlot[] = [
  { key: 'T1', label: 'Handoff', hint: 'Counselor agreed on the call' },
];

/**
 * Marketing tail. Only for leads with zero engagement across day one, so it is
 * offered on every bucket rather than tied to one outcome.
 */
export const MARKETING_SLOTS: CadenceSlot[] = [
  { key: 'M1', label: 'Re-engagement', hint: '+3 days, marketing category' },
  { key: 'M2', label: 'Final message', hint: '+1 week after M1, then removed permanently' },
];

const BUCKET_TRACKS: Record<string, CadenceSlot[]> = {
  did_not_pick_up: N_TRACK,
  uncertain: U_TRACK,
  certain: QUALIFIED_TRACK,
  interested: QUALIFIED_TRACK,
};

/** Suggested slots for a bucket, plus the marketing tail. */
export const cadenceSlotsForBucket = (bucketKey: string): CadenceSlot[] => [
  ...(BUCKET_TRACKS[bucketKey] ?? []),
  ...MARKETING_SLOTS,
];

export const cadenceSlot = (bucketKey: string, stepKey: string): CadenceSlot | null =>
  cadenceSlotsForBucket(bucketKey).find((slot) => slot.key === stepKey) ?? null;

/** The next preset slot not already used in this bucket. */
export const nextCadenceSlot = (bucketKey: string, usedKeys: string[]): CadenceSlot | null => {
  const used = new Set(usedKeys);

  return cadenceSlotsForBucket(bucketKey).find((slot) => !used.has(slot.key)) ?? null;
};

const NAME_PLACEHOLDER = /\{\{\s*(name|first_name|student_name|lead_name|customer_name)\s*\}\}/i;

/**
 * Whether a template greets by name. Such a template needs an approved no-name
 * variant, otherwise a lead with no usable name is skipped entirely.
 */
export const templateUsesName = (bodyText?: string | null): boolean =>
  NAME_PLACEHOLDER.test(String(bodyText ?? ''));

export const templateBodyText = (
  components?: Array<{ type?: string; text?: string }> | null,
): string => components?.find((part) => String(part?.type ?? '').toUpperCase() === 'BODY')?.text ?? '';
