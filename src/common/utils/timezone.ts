/**
 * Shared local-timezone date helpers. Centralizes the "what day/range is
 * this UTC instant in the salon's timezone" logic so every module (sales,
 * analytics, timeclock) agrees on where a calendar day starts and ends —
 * a client-computed UTC date string and a server-computed local-day range
 * disagree for hours near local midnight (UTC-6), which is exactly the
 * mismatch that made "Hoy" show different results in different screens.
 */

const DEFAULT_TZ = 'America/El_Salvador';

/** Calendar day (YYYY-MM-DD) of `date` in `timeZone`, not UTC. */
export function toLocalDateStr(date: Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function tzOffsetMs(timeZone: string, date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tz = new Date(date.toLocaleString('en-US', { timeZone }));
  return utc.getTime() - tz.getTime();
}

/** UTC instant bounds of a YYYY-MM-DD calendar day as lived in `timeZone`. */
export function localDayRange(
  dateStr: string,
  timeZone = DEFAULT_TZ,
): { from: Date; to: Date } {
  const naiveStart = new Date(`${dateStr}T00:00:00Z`);
  const offset = tzOffsetMs(timeZone, naiveStart);
  const from = new Date(naiveStart.getTime() + offset);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from, to };
}

export interface ParsedDateRange {
  from: Date;
  to: Date;
  cacheKey: string;
  includesToday: boolean;
}

/**
 * Resolves a quick-range key ('today' | '7d' | '30d' | '90d' | '365d') or an
 * explicit `from`/`to` pair (YYYY-MM-DD, inclusive of the full local day) into
 * concrete UTC instant bounds, using the salon's local calendar day.
 */
export function parseDateRange(
  range?: string,
  from?: string,
  to?: string,
  timeZone = DEFAULT_TZ,
): ParsedDateRange {
  const todayStr = toLocalDateStr(new Date(), timeZone);

  if (from && to) {
    return {
      from: localDayRange(from, timeZone).from,
      to: localDayRange(to, timeZone).to,
      cacheKey: `${from}:${to}`,
      includesToday: to >= todayStr,
    };
  }

  const r = range ?? '30d';
  if (r === 'today') {
    const today = localDayRange(todayStr, timeZone);
    return { from: today.from, to: today.to, cacheKey: 'today', includesToday: true };
  }

  const days = parseInt(r, 10) || 30;
  return {
    from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    to: new Date(),
    cacheKey: r,
    includesToday: true,
  };
}
