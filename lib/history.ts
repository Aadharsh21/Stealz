// Price history: every time we see prices (searches, product pages, the daily alert check)
// we store a snapshot, and the chart shows the lowest total per day.

import type { HistoryPoint, Offer } from './types';
import { hasDatabase } from './config';
import { query } from './db';

export interface SnapshotRow {
  productKey: string;
  store: string;
  price: number;
  total: number;
  currency: string;
  source: 'search' | 'product' | 'cron';
}

export function snapshotRows(productKey: string, offers: Offer[], source: SnapshotRow['source']): SnapshotRow[] {
  return offers
    .filter((o) => o.inStock !== false && o.source !== 'demo')
    .map((o) => ({ productKey, store: o.store, price: o.price, total: o.total, currency: o.currency, source }));
}

/** Saves snapshots, skipping a store's price if the same total was saved in the last 6 hours. */
export async function recordSnapshots(rows: SnapshotRow[]): Promise<void> {
  if (!hasDatabase() || rows.length === 0) return;
  const cheapest = new Map<string, SnapshotRow>();
  for (const r of rows) {
    const k = `${r.productKey}|${r.store}`;
    const prev = cheapest.get(k);
    if (!prev || r.total < prev.total) cheapest.set(k, r);
  }
  const list = [...cheapest.values()].slice(0, 250);
  try {
    await query(
      `insert into price_snapshots (product_key, store, price, total, currency, source)
       select x.k, x.s, x.p, x.t, x.c, x.src
       from unnest($1::text[], $2::text[], $3::float8[], $4::float8[], $5::text[], $6::text[]) as x(k, s, p, t, c, src)
       where not exists (
         select 1 from price_snapshots ps
         where ps.product_key = x.k and ps.store = x.s and ps.total = x.t
           and ps.captured_at > now() - interval '6 hours'
       )`,
      [
        list.map((r) => r.productKey),
        list.map((r) => r.store),
        list.map((r) => r.price),
        list.map((r) => r.total),
        list.map((r) => r.currency),
        list.map((r) => r.source),
      ],
    );
  } catch (err) {
    console.error('[history] failed to save snapshots', err);
  }
}

/** Lowest total per day for a product (UTC days), oldest first. */
export async function getHistory(productKey: string, days = 120): Promise<HistoryPoint[]> {
  if (!hasDatabase()) return [];
  try {
    const rows = await query<{ day: string; low: number; store: string }>(
      `select to_char(captured_at at time zone 'UTC', 'YYYY-MM-DD') as day,
              min(total)::float8 as low,
              (array_agg(store order by total asc))[1] as store
         from price_snapshots
        where product_key = $1 and captured_at > now() - make_interval(days => $2::int)
        group by 1
        order by 1`,
      [productKey, days],
    );
    return rows.map((r) => ({ date: r.day, low: Number(r.low), store: r.store }));
  } catch (err) {
    console.error('[history] failed to read history', err);
    return [];
  }
}
