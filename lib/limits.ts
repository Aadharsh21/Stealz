// Rate limits per visitor and a daily/monthly budget for paid live searches, so a public
// site can't burn through the SerpApi plan.

import { config, hasDatabase } from './config';
import { query } from './db';

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export interface CounterResult {
  ok: boolean;
  count: number;
  resetAt: Date;
}

/** Adds one to a counter that resets after `windowSeconds`, and checks it against `limit`. */
export async function hitCounter(bucket: string, limit: number, windowSeconds: number): Promise<CounterResult> {
  if (hasDatabase()) {
    try {
      const rows = await query<{ count: number; reset_at: string | Date }>(
        `insert into counters (bucket, count, reset_at) values ($1, 1, now() + make_interval(secs => $2::float8))
         on conflict (bucket) do update set
           count = case when counters.reset_at <= now() then 1 else counters.count + 1 end,
           reset_at = case when counters.reset_at <= now() then now() + make_interval(secs => $2::float8) else counters.reset_at end
         returning count, reset_at`,
        [bucket, windowSeconds],
      );
      const row = rows[0];
      const count = Number(row?.count ?? 1);
      return { ok: count <= limit, count, resetAt: new Date(row?.reset_at ?? Date.now()) };
    } catch (err) {
      console.error('[limits] counter failed, using memory', err);
    }
  }
  const now = Date.now();
  const entry = memoryCounters.get(bucket);
  if (!entry || entry.resetAt <= now) {
    memoryCounters.set(bucket, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: 1 <= limit, count: 1, resetAt: new Date(now + windowSeconds * 1000) };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, count: entry.count, resetAt: new Date(entry.resetAt) };
}

export async function readCounter(bucket: string): Promise<number> {
  if (hasDatabase()) {
    try {
      const rows = await query<{ count: number }>(`select count from counters where bucket = $1 and reset_at > now()`, [bucket]);
      return Number(rows[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }
  const entry = memoryCounters.get(bucket);
  return entry && entry.resetAt > Date.now() ? entry.count : 0;
}

function dayBucket(d = new Date()): string {
  return `credits:day:${d.toISOString().slice(0, 10)}`;
}
function monthBucket(d = new Date()): string {
  return `credits:month:${d.toISOString().slice(0, 7)}`;
}

export class BudgetError extends Error {
  constructor(public scope: 'day' | 'month') {
    super(scope === 'day' ? 'daily' : 'monthly');
  }
}

/** Uses one paid live-search credit, or throws BudgetError when today's or this month's budget is spent. */
export async function takeLiveCredit(): Promise<void> {
  const c = config();
  const day = await hitCounter(dayBucket(), c.dailyLiveSearches, 36 * 3600);
  if (!day.ok) throw new BudgetError('day');
  const month = await hitCounter(monthBucket(), c.monthlyLiveSearches, 32 * 86400);
  if (!month.ok) throw new BudgetError('month');
}

export async function liveCreditUsage(): Promise<{ today: number; month: number; dailyLimit: number; monthlyLimit: number }> {
  const c = config();
  return {
    today: await readCounter(dayBucket()),
    month: await readCounter(monthBucket()),
    dailyLimit: c.dailyLiveSearches,
    monthlyLimit: c.monthlyLiveSearches,
  };
}

/** Best-effort client IP from Vercel / proxy headers. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64);
  return (headers.get('x-real-ip') ?? 'unknown').slice(0, 64);
}
