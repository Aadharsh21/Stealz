// Saved promo codes. Codes are collected whenever a live search or product page shows one
// (no extra searches), and the coupons page lists the ones seen in the last 30 days.

import type { CountryCode } from './types';
import type { CouponRow, FoundCoupon } from './coupon-codes';
import { hasDatabase } from './config';
import { query } from './db';
import { cleanStoreName } from './stores';

export async function recordCoupons(country: CountryCode, coupons: FoundCoupon[], productRef?: string): Promise<void> {
  if (!hasDatabase() || coupons.length === 0) return;
  try {
    for (const c of coupons.slice(0, 20)) {
      await query(
        `insert into coupons (country, store, code, detail, link, product_title, product_ref)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (country, store, code) do update set
           last_seen = now(),
           seen_count = coupons.seen_count + 1,
           detail = coalesce(excluded.detail, coupons.detail),
           link = coalesce(excluded.link, coupons.link),
           product_title = coalesce(excluded.product_title, coupons.product_title),
           product_ref = coalesce(excluded.product_ref, coupons.product_ref)`,
        [country, cleanStoreName(c.store), c.code, c.detail ?? null, c.link ?? null, c.title.slice(0, 200), productRef ?? null],
      );
    }
  } catch (err) {
    console.error('[coupons] could not save codes', err);
  }
}

interface Row {
  store: string;
  code: string;
  detail: string | null;
  link: string | null;
  product_title: string | null;
  product_ref: string | null;
  seen_count: number;
  first_seen: string | Date;
  last_seen: string | Date;
}

const iso = (v: string | Date) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

/** Codes seen for this country in the last 30 days, newest first. */
export async function listCoupons(country: CountryCode, limit = 40): Promise<CouponRow[]> {
  if (!hasDatabase()) return [];
  const rows = await query<Row>(
    `select store, code, detail, link, product_title, product_ref, seen_count, first_seen, last_seen
     from coupons
     where country = $1 and last_seen > now() - interval '30 days'
     order by last_seen desc
     limit $2`,
    [country, limit],
  );
  return rows.map((r) => ({
    store: r.store,
    code: r.code,
    detail: r.detail ?? undefined,
    link: r.link ?? undefined,
    productTitle: r.product_title ?? undefined,
    productRef: r.product_ref ?? undefined,
    seenCount: r.seen_count,
    firstSeen: iso(r.first_seen),
    lastSeen: iso(r.last_seen),
  }));
}
