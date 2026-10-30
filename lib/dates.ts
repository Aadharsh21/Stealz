// Calendar-day helpers. A "day number" is the count of days since 1970-01-01 for a local
// calendar date, which keeps date math free of time zone and daylight saving problems.

const MS_PER_DAY = 86_400_000;

export function dayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** Today's calendar date in the given time zone, as a day number. */
export function todayIn(timeZone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return dayNumber(get('year'), get('month'), get('day'));
}

export function isoFromDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function dayFromIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return dayNumber(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(day: number): number {
  return new Date(day * MS_PER_DAY).getUTCDay();
}

export function yearOf(day: number): number {
  return new Date(day * MS_PER_DAY).getUTCFullYear();
}

export function addBusinessDays(start: number, count: number, weekend: number[]): number {
  let day = start;
  let added = 0;
  while (added < count) {
    day += 1;
    if (!weekend.includes(weekdayOf(day))) added += 1;
  }
  return day;
}

/** "Tue, Nov 4" (or "Tue, 4 Nov" for en-IN / en-AE style locales). */
export function formatDay(iso: string, locale = 'en-US', withWeekday = true): string {
  const day = dayFromIso(iso);
  if (day == null) return iso;
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
  }).format(new Date(day * MS_PER_DAY));
}

export function formatRange(minIso: string, maxIso: string, locale = 'en-US'): string {
  if (minIso === maxIso) return formatDay(minIso, locale);
  const a = dayFromIso(minIso);
  const b = dayFromIso(maxIso);
  if (a == null || b == null) return `${minIso} – ${maxIso}`;
  const da = new Date(a * MS_PER_DAY);
  const db = new Date(b * MS_PER_DAY);
  const sameMonth = da.getUTCMonth() === db.getUTCMonth() && da.getUTCFullYear() === db.getUTCFullYear();
  const dayFirst = locale !== 'en-US';
  const month = (d: Date) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short' }).format(d);
  if (sameMonth) {
    return dayFirst
      ? `${da.getUTCDate()}–${db.getUTCDate()} ${month(db)}`
      : `${month(da)} ${da.getUTCDate()}–${db.getUTCDate()}`;
  }
  return `${formatDay(minIso, locale, false)} – ${formatDay(maxIso, locale, false)}`;
}

export const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
