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

function getTimeZoneParts(date: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.formatToParts(date).reduce<Record<string, number>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = Number(part.value);
    }

    return acc;
  }, {});
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const desiredWallClock = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcGuess = desiredWallClock;

  for (let i = 0; i < 4; i += 1) {
    const actualParts = getTimeZoneParts(new Date(utcGuess), timeZone);
    const actualWallClock = Date.UTC(
      actualParts.year,
      (actualParts.month ?? 1) - 1,
      actualParts.day ?? 1,
      actualParts.hour ?? 0,
      actualParts.minute ?? 0,
      actualParts.second ?? 0,
    );
    const diff = desiredWallClock - actualWallClock;
    utcGuess += diff;

    if (diff === 0) break;
  }

  return new Date(utcGuess);
}

export function getNextOccurrenceUtcIso(
  time: string,
  timeZone: string,
  now: Date = new Date(),
): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const nowParts = getTimeZoneParts(now, timeZone);
  let year = nowParts.year;
  let month = nowParts.month;
  let day = nowParts.day;

  let candidate = zonedDateTimeToUtc(year, month, day, hour, minute, timeZone);
  if (candidate.getTime() <= now.getTime()) {
    const nextDay = new Date(Date.UTC(year, month - 1, day) + 24 * 60 * 60 * 1000);
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth() + 1;
    day = nextDay.getUTCDate();
    candidate = zonedDateTimeToUtc(year, month, day, hour, minute, timeZone);
  }

  return candidate.toISOString().replace('.000Z', 'Z');
}

export function formatInTimeZone(
  value: string | number | Date | null | undefined,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : parseApiDate(typeof value === 'number' ? String(value) : value ?? null);
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date);
}
