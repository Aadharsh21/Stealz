// Small cache for API responses so repeated searches don't use paid credits.
// Uses Postgres when DATABASE_URL is set (shared by every server instance) plus an
// in-memory layer for the current instance.

import { hasDatabase } from './config';
import { query } from './db';

const MAX_MEMORY_ENTRIES = 400;
const memory = new Map<string, { value: unknown; expires: number }>();

function remember(key: string, value: unknown, ttlSeconds: number): void {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (hit) {
    if (hit.expires > Date.now()) return structuredClone(hit.value) as T;
    memory.delete(key);
  }
  if (!hasDatabase()) return null;
  try {
    const rows = await query<{ value: T; ttl: number }>(
      `select value, extract(epoch from (expires_at - now()))::float8 as ttl from api_cache where key = $1 and expires_at > now()`,
      [key],
    );
    if (rows[0]) {
      remember(key, rows[0].value, Math.min(300, Math.max(1, Number(rows[0].ttl))));
      return rows[0].value;
    }
  } catch (err) {
    console.error('[cache] read failed', err);
  }
  return null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  remember(key, structuredClone(value), ttlSeconds);
  if (!hasDatabase()) return;
  try {
    await query(
      `insert into api_cache (key, value, expires_at) values ($1, $2::jsonb, now() + make_interval(secs => $3::float8))
       on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at`,
      [key, JSON.stringify(value), ttlSeconds],
    );
  } catch (err) {
    console.error('[cache] write failed', err);
  }
}

export async function purgeExpiredCache(): Promise<number> {
  if (!hasDatabase()) return 0;
  const rows = await query<{ key: string }>(`delete from api_cache where expires_at < now() returning key`);
  await query(`delete from counters where reset_at < now() - interval '2 days'`);
  return rows.length;
}
