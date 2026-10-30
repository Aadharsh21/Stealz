// Price-drop alerts. No accounts: shoppers give an email, confirm it with one click, and every
// email has a one-click unsubscribe link. Checks run when anyone views the product and once a
// day from the cron job.

import type { CurrencyCode, Offer, ProductDetails, ProductRef, ResolvedLocation } from './types';
import { BRAND } from './brand';
import { config, emailEnabled, hasDatabase } from './config';
import { query } from './db';
import { confirmEmail, dropEmail, sendEmail } from './email';
import { AppError, secondsUntil } from './errors';
import { hitCounter } from './limits';
import { formatMoney, round2 } from './money';
import { encodeRef, productHref } from './ref';
import { cheapestOf } from './scoring';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
/** Without a target price, alert when the price falls at least this much below the starting price. */
const MIN_DROP = 0.03;

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function productUrl(ref: ProductRef): string {
  return `${config().appUrl}${productHref(encodeRef(ref))}`;
}

export interface CreateAlertInput {
  ref: ProductRef;
  email: string;
  targetPrice: number | null;
  currentLow: number;
  currency: CurrencyCode;
  location: ResolvedLocation;
  image?: string;
  ip: string;
}

export async function createAlert(input: CreateAlertInput): Promise<{ status: 'pending' | 'active'; message: string }> {
  if (!hasDatabase() || !emailEnabled()) {
    throw new AppError('Price alerts are not set up on this site yet.', 501, 'server');
  }
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) throw new AppError('Please enter a valid email address.', 400, 'bad_request');
  if (!(input.currentLow > 0)) throw new AppError('Missing the current price.', 400, 'bad_request');
  const target = input.targetPrice == null ? null : round2(input.targetPrice);
  if (target != null && (!(target > 0) || target >= input.currentLow)) {
    throw new AppError(`Pick a target below the current price of ${formatMoney(input.currentLow, input.currency)}.`, 400, 'bad_request');
  }

  const perIp = await hitCounter(`ip:alerts:${input.ip}`, config().alertsPerIpPerHour, 3600);
  if (!perIp.ok) throw new AppError('Too many alerts from your connection. Try again later.', 429, 'rate_limited', secondsUntil(perIp.resetAt));
  const perEmail = await hitCounter(`email:alerts:${email}`, 10, 86400);
  if (!perEmail.ok) throw new AppError('That email has set up a lot of alerts today. Try again tomorrow.', 429, 'rate_limited', secondsUntil(perEmail.resetAt));

  const { ref } = input;
  const location = {
    country: input.location.country,
    postalCode: input.location.postalCode,
    city: input.location.city,
    region: input.location.region,
    regionCode: input.location.regionCode,
    source: input.location.source,
    timeZone: input.location.timeZone,
  };
  await query(
    `insert into tracked_products (product_key, country, title, image, query, ref, location, currency, last_low)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
     on conflict (product_key) do update set
       title = excluded.title,
       image = coalesce(excluded.image, tracked_products.image),
       query = excluded.query,
       ref = excluded.ref,
       location = excluded.location,
       last_low = least(coalesce(tracked_products.last_low, excluded.last_low), excluded.last_low)`,
    [ref.k, input.location.country, ref.title, input.image ?? ref.img ?? null, ref.q, JSON.stringify(ref), JSON.stringify(location), input.currency, input.currentLow],
  );

  const rows = await query<{ status: string; token: string }>(
    `insert into alerts (product_key, email, target_price, baseline_price, currency, token)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (product_key, lower(email)) where status in ('pending', 'active')
     do update set target_price = excluded.target_price, baseline_price = excluded.baseline_price
     returning status, token`,
    [ref.k, email, target, input.currentLow, input.currency, newToken()],
  );
  const alert = rows[0];
  if (alert?.status === 'active') {
    return { status: 'active', message: "You're already watching this item. We updated your target price." };
  }

  const msg = confirmEmail({
    title: ref.title,
    currentPrice: formatMoney(input.currentLow, input.currency),
    target: target != null ? formatMoney(target, input.currency) : null,
    confirmUrl: `${config().appUrl}/alerts/confirm?token=${alert.token}`,
    productUrl: productUrl(ref),
  });
  const sent = await sendEmail({ to: email, ...msg });
  if (!sent.ok) throw new AppError("We couldn't send the confirmation email. Please try again later.", 502, 'provider');
  return { status: 'pending', message: `Check your inbox to confirm. We sent a link to ${email}.` };
}

export async function confirmAlert(token: string): Promise<{ title: string; ref: ProductRef } | null> {
  if (!hasDatabase() || !/^[a-f0-9]{48}$/.test(token)) return null;
  const rows = await query<{ title: string; ref: ProductRef }>(
    `update alerts a set status = 'active', confirmed_at = coalesce(a.confirmed_at, now())
       from tracked_products p
      where a.token = $1 and a.status in ('pending', 'active') and p.product_key = a.product_key
      returning p.title, p.ref`,
    [token],
  );
  return rows[0] ?? null;
}

export async function unsubscribeAlert(token: string): Promise<{ title: string } | null> {
  if (!hasDatabase() || !/^[a-f0-9]{48}$/.test(token)) return null;
  const rows = await query<{ title: string }>(
    `update alerts a set status = 'unsubscribed'
       from tracked_products p
      where a.token = $1 and p.product_key = a.product_key
      returning p.title`,
    [token],
  );
  return rows[0] ?? null;
}

interface AlertRow {
  id: string;
  email: string;
  token: string;
  target_price: number | null;
  baseline_price: number;
  currency: CurrencyCode;
  last_notified_price: number | null;
  last_notified_at: string | Date | null;
  ref: ProductRef;
  title: string;
}

/** Emails everyone whose alert condition is met by the current offers. Returns emails sent. */
export async function checkAlertsForProduct(
  productKey: string,
  offers: Offer[],
  product?: Pick<ProductDetails, 'title'>,
  _loc?: ResolvedLocation,
): Promise<number> {
  if (!hasDatabase()) return 0;
  const best = cheapestOf(offers);
  if (!best) return 0;
  await query(`update tracked_products set last_checked_at = now(), last_low = $2 where product_key = $1`, [productKey, best.total]);
  const alerts = await query<AlertRow>(
    `select a.id, a.email, a.token, a.target_price, a.baseline_price, a.currency, a.last_notified_price,
            a.last_notified_at, p.ref, p.title
       from alerts a join tracked_products p on p.product_key = a.product_key
      where a.product_key = $1 and a.status = 'active'
        and (a.last_notified_at is null or a.last_notified_at < now() - interval '20 hours')`,
    [productKey],
  );
  let sent = 0;
  for (const a of alerts) {
    if (a.currency !== best.currency) continue;
    const target = a.target_price != null ? Number(a.target_price) : null;
    const baseline = Number(a.baseline_price);
    const threshold = target ?? baseline * (1 - MIN_DROP);
    const lastNotified = a.last_notified_price != null ? Number(a.last_notified_price) : null;
    if (best.total > threshold) continue;
    if (lastNotified != null && best.total >= lastNotified - 0.01) continue;
    const msg = dropEmail({
      title: product?.title ?? a.title,
      newPrice: formatMoney(best.total, best.currency),
      oldPrice: formatMoney(lastNotified ?? baseline, best.currency),
      store: best.store,
      storeUrl: best.link,
      productUrl: productUrl(a.ref),
      unsubscribePageUrl: `${config().appUrl}/alerts/unsubscribe?token=${a.token}`,
      unsubscribeUrl: `${config().appUrl}/api/alerts/unsubscribe?token=${a.token}`,
      targetReached: target != null,
    });
    const result = await sendEmail({ to: a.email, ...msg });
    if (result.ok) {
      sent += 1;
      await query(`update alerts set last_notified_at = now(), last_notified_price = $2 where id = $1`, [a.id, best.total]);
    }
  }
  if (sent > 0) console.info(`[alerts] ${BRAND.name}: sent ${sent} alert email(s) for ${productKey}`);
  return sent;
}

/** Products with active alerts that are due for a check, least recently checked first. */
export async function productsDueForCheck(limit: number): Promise<{ product_key: string; ref: ProductRef; location: ResolvedLocation }[]> {
  if (!hasDatabase()) return [];
  return query(
    `select p.product_key, p.ref, p.location
       from tracked_products p
      where exists (select 1 from alerts a where a.product_key = p.product_key and a.status = 'active')
        and (p.last_checked_at is null or p.last_checked_at < now() - interval '20 hours')
      order by p.last_checked_at nulls first
      limit $1`,
    [limit],
  );
}
