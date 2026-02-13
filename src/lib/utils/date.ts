export function parseApiTimestamp(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  const normalizedSeparator = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalizedSeparator);
  const normalized = hasTimezone ? normalizedSeparator : `${normalizedSeparator}Z`;
  const parsed = Date.parse(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}

export function parseApiDate(value: string | null | undefined): Date | null {
  const timestamp = parseApiTimestamp(value);
  if (timestamp === null) return null;

  return new Date(timestamp);
}
