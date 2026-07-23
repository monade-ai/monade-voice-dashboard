import type { QualificationBucket } from '@/app/hooks/use-post-processing-templates';

export const INVALID_OUTCOME_KEYS_MESSAGE = 'This template has invalid or missing outcome keys. Please update the qualification bucket keys in the post-processing template first.';

export const normalizeOutcomeKey = (key: string) => key.trim().toLowerCase();

/**
 * Keys the backend persists on every template as system defaults (e.g. the
 * unanswered-call outcome). They live in `outcome_keys` but never in
 * `content.qualification_buckets`, so they must be excluded from the
 * bucket/snapshot sync comparison to avoid a false length mismatch.
 */
export const SYSTEM_OUTCOME_KEYS = new Set(['did_not_pick_up']);

export const isSystemOutcomeKey = (key: string) => SYSTEM_OUTCOME_KEYS.has(normalizeOutcomeKey(key));

const withoutSystemKeys = (keys: string[]) => keys.filter((key) => !isSystemOutcomeKey(key));

export const humanizeOutcomeKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const getBucketKeys = (buckets: QualificationBucket[]) => (
  buckets.map((bucket) => bucket.key.trim()).filter(Boolean)
);

export const normalizeOutcomeKeys = (keys?: string[] | null) => (
  Array.isArray(keys) ? keys.map((key) => key.trim()).filter(Boolean) : []
);

export const areOutcomeKeysSynced = (
  storedOutcomeKeys: string[] | null | undefined,
  buckets: QualificationBucket[],
) => {
  const bucketKeys = getBucketKeys(buckets);
  const snapshotKeys = normalizeOutcomeKeys(storedOutcomeKeys);

  // System keys (e.g. did_not_pick_up) live in outcome_keys but not in the
  // qualification buckets, so compare only the user-defined keys on both sides.
  const comparableBucketKeys = withoutSystemKeys(bucketKeys);
  const comparableSnapshotKeys = withoutSystemKeys(snapshotKeys);

  if (comparableSnapshotKeys.length === 0) {
    return { valid: false, bucketKeys, snapshotKeys, reason: 'missing' as const };
  }

  if (comparableSnapshotKeys.length !== comparableBucketKeys.length) {
    return { valid: false, bucketKeys, snapshotKeys, reason: 'mismatch' as const };
  }

  const sameKeys = comparableSnapshotKeys.every(
    (key, index) => normalizeOutcomeKey(key) === normalizeOutcomeKey(comparableBucketKeys[index] || ''),
  );

  return {
    valid: sameKeys,
    bucketKeys,
    snapshotKeys,
    reason: sameKeys ? ('valid' as const) : ('mismatch' as const),
  };
};
