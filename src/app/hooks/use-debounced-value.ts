'use client';

import { useEffect, useState } from 'react';

/**
 * Holds a value back until it has stopped changing for `delayMs`.
 *
 * This exists for search inputs that feed server-side filters. `useDeferredValue`
 * is not a substitute: it only lets React de-prioritise a re-render, it still
 * settles on every keystroke, so an effect keyed on it fires a request per
 * character. The archive's `search` filter runs a `LIKE '%…%'` over a JSON
 * extract twice per request (once for rows, once for the total) and cannot use
 * the pagination indexes, so per-keystroke requests are expensive server-side.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
