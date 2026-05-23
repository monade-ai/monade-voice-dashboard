import type { QualificationBucket } from '@/app/hooks/use-post-processing-templates';

export const INVALID_OUTCOME_KEYS_MESSAGE = 'This template has invalid or missing outcome keys. Please update the qualification bucket keys in the post-processing template first.';

export const normalizeOutcomeKey = (key: string) => key.trim().toLowerCase();

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

  if (snapshotKeys.length === 0) {
    return { valid: false, bucketKeys, snapshotKeys, reason: 'missing' as const };
  }

  if (snapshotKeys.length !== bucketKeys.length) {
    return { valid: false, bucketKeys, snapshotKeys, reason: 'mismatch' as const };
  }

  const sameKeys = snapshotKeys.every((key, index) => normalizeOutcomeKey(key) === normalizeOutcomeKey(bucketKeys[index] || ''));

  return {
    valid: sameKeys,
    bucketKeys,
    snapshotKeys,
    reason: sameKeys ? ('valid' as const) : ('mismatch' as const),
  };
};
