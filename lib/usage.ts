// Tells the site owner, by email, before live searches run out: at 80% and 100% of the monthly
// limit, when the daily limit is hit, and when the SerpApi plan itself is nearly used up.

import { cacheGet, cacheSet } from './cache';
import { config, emailEnabled } from './config';
import { sendEmail, usageEmail } from './email';
import type { UsageAlertKind } from './email';

export interface SerpApiAccount {
  used: number;
  perMonth: number;
  left: number;
  renews: string | null;
}

/** SerpApi's own usage numbers. The Account API is free and doesn't use a search. */
export async function serpApiAccount(): Promise<SerpApiAccount | null> {
  const key = config().serpApiKey;
  if (!key) return null;
  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
    return {
      used: n(j.this_month_usage),
      perMonth: n(j.searches_per_month),
      left: n(j.total_searches_left ?? j.plan_searches_left),
      renews: typeof j.plan_renewal_date === 'string' ? j.plan_renewal_date : null,
    };
  } catch {
    return null;
  }
}

/** Sends one warning per kind per period (day or month). Never throws. */
export async function notifyOwner(
  kind: UsageAlertKind,
  period: string,
  details: { used: number; limit: number; left?: number; renews?: string | null },
): Promise<boolean> {
  const to = config().ownerEmail;
  if (!to || !emailEnabled()) return false;
  const flag = `owner-alert:${kind}:${period}`;
  try {
    if (await cacheGet<boolean>(flag)) return false;
    await cacheSet(flag, true, 40 * 86400);
    const result = await sendEmail({ to, ...usageEmail({ kind, ...details, appUrl: config().appUrl }) });
    return result.ok;
  } catch (err) {
    console.error('[usage] owner warning failed', err);
    return false;
  }
}

/** Daily backup check against SerpApi's own numbers (run by the cron job). */
export async function checkPlanUsage(now = new Date()): Promise<SerpApiAccount | null> {
  const account = await serpApiAccount();
  if (!account || account.perMonth <= 0) return account;
  const period = account.renews ?? now.toISOString().slice(0, 7);
  const share = account.used / account.perMonth;
  const details = { used: account.used, limit: account.perMonth, left: account.left, renews: account.renews };
  if (account.left <= 0 || share >= 1) await notifyOwner('plan-100', period, details);
  else if (share >= 0.8) await notifyOwner('plan-80', period, details);
  return account;
}
