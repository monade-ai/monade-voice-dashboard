'use client';

type CacheScope = {
  userUid: string;
  organizationId?: string | null;
};

type CacheEntry<T> = {
  value: T;
  cachedAt: number;
  expiresAt: number;
};

const CACHE_PREFIX = 'monade-cache:v1';
const MAX_CACHE_ENTRIES = 120;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function slug(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 48);
}

export function getCurrentOrganizationId() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    return storage.getItem('current_organization_id');
  } catch {
    return null;
  }
}

export function createScopedCacheKey(scope: CacheScope, resource: string, params?: unknown) {
  const scopeKey = {
    userUid: scope.userUid,
    organizationId: scope.organizationId ?? 'none',
    params: params ?? null,
  };
  const digest = hashString(stableStringify(scopeKey));

  return `${CACHE_PREFIX}:${slug(resource)}:${digest}`;
}

export function readLocalCache<T>(key: string): CacheEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.expiresAt !== 'number' || Date.now() > entry.expiresAt) {
      storage.removeItem(key);

      return null;
    }

    return entry;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage failures; the app can continue without the cache.
    }

    return null;
  }
}

export function writeLocalCache<T>(key: string, value: T, ttlMs: number) {
  const storage = getStorage();
  if (!storage) return;

  const now = Date.now();
  const entry: CacheEntry<T> = {
    value,
    cachedAt: now,
    expiresAt: now + ttlMs,
  };

  try {
    storage.setItem(key, JSON.stringify(entry));
    pruneLocalCache();
  } catch {
    pruneLocalCache(Math.floor(MAX_CACHE_ENTRIES / 2));
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // Ignore quota failures; the app still has in-memory state.
    }
  }
}

export function removeLocalCache(key: string) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures; the app can continue without the cache.
  }
}

export function clearLocalCacheByResource(resource: string) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const prefix = `${CACHE_PREFIX}:${slug(resource)}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch {
    // Ignore storage failures; the app can continue without the cache.
  }
}

function pruneLocalCache(maxEntries = MAX_CACHE_ENTRIES) {
  const storage = getStorage();
  if (!storage) return;

  const entries: Array<{ key: string; cachedAt: number; expiresAt: number }> = [];
  const now = Date.now();
  const expiredKeys: string[] = [];

  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key?.startsWith(`${CACHE_PREFIX}:`)) continue;

      try {
        const entry = JSON.parse(storage.getItem(key) || '{}') as CacheEntry<unknown>;
        if (!entry.expiresAt || entry.expiresAt <= now) {
          expiredKeys.push(key);
        } else {
          entries.push({ key, cachedAt: entry.cachedAt || 0, expiresAt: entry.expiresAt });
        }
      } catch {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => storage.removeItem(key));

    if (entries.length <= maxEntries) return;

    entries
      .sort((a, b) => a.cachedAt - b.cachedAt)
      .slice(0, entries.length - maxEntries)
      .forEach((entry) => storage.removeItem(entry.key));
  } catch {
    // Ignore storage failures; the app can continue without the cache.
  }
}
