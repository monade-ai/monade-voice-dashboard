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

/**
 * Bucket keys are author-defined in the post-processing template, so they vary
 * in case and wording — real data has `Qualified` and `not_interested`, not the
 * `certain` / `interested` this originally matched on. Matching is therefore
 * normalised and aliased rather than exact.
 */
const BUCKET_TRACKS: Record<string, CadenceSlot[]> = {
  did_not_pick_up: N_TRACK,
  no_answer: N_TRACK,
  not_picked_up: N_TRACK,
  uncertain: U_TRACK,
  call_disconnected: U_TRACK,
  incomplete: U_TRACK,
  certain: QUALIFIED_TRACK,
  interested: QUALIFIED_TRACK,
  qualified: QUALIFIED_TRACK,
  likely_to_book: QUALIFIED_TRACK,
};

/**
 * Outcomes that terminate the ladder. The cadence is explicit that qualified
 * and not-interested leads never enter the marketing tail, so offering M1/M2
 * on those buckets was the UI recommending a spec violation — messaging a
 * student three days after they converted, or after they declined.
 */
const TERMINAL_BUCKETS = new Set([
  'not_interested',
  'certain',
  'interested',
  'qualified',
  'likely_to_book',
]);

const normaliseBucketKey = (bucketKey: string) => String(bucketKey || '').trim().toLowerCase();

/** Suggested slots for a bucket. The marketing tail is only offered where it is allowed. */
export const cadenceSlotsForBucket = (bucketKey: string): CadenceSlot[] => {
  const key = normaliseBucketKey(bucketKey);
  const track = BUCKET_TRACKS[key];

  // No recognised track means we do not know where this bucket sits in the
  // ladder. Suggesting the marketing tail anyway is how a converted lead ended
  // up being offered a re-engagement message — better to suggest nothing and
  // let the editor fall back to generic steps.
  if (!track) return [];

  return TERMINAL_BUCKETS.has(key) ? track : [...track, ...MARKETING_SLOTS];
};

/** True when this bucket has no cadence track at all, so the editor can say so. */
export const hasCadenceTrack = (bucketKey: string): boolean =>
  (BUCKET_TRACKS[normaliseBucketKey(bucketKey)] ?? []).length > 0;

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
