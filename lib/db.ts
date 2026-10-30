// Postgres access through Neon's serverless HTTP driver. The schema is created automatically
// the first time the app talks to an empty database, so there are no migrations to run.

import { neon } from '@neondatabase/serverless';
import { config } from './config';

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | null | undefined;
let schemaReady: Promise<void> | null = null;

function getClient(): SqlClient | null {
  if (client === undefined) {
    const url = config().databaseUrl;
    client = url ? neon(url) : null;
  }
  return client;
}

const SCHEMA = [
  `create table if not exists price_snapshots (
    id bigserial primary key,
    product_key text not null,
    store text not null,
    price double precision not null,
    total double precision not null,
    currency text not null,
    source text not null,
    captured_at timestamptz not null default now()
  )`,
  `create index if not exists price_snapshots_key_time on price_snapshots (product_key, captured_at desc)`,
  `create table if not exists tracked_products (
    product_key text primary key,
    country text not null,
    title text not null,
    image text,
    query text not null,
    ref jsonb not null,
    location jsonb not null,
    currency text not null,
    last_checked_at timestamptz,
    last_low double precision,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists alerts (
    id uuid primary key default gen_random_uuid(),
    product_key text not null references tracked_products(product_key) on delete cascade,
    email text not null,
    target_price double precision,
    baseline_price double precision not null,
    currency text not null,
    status text not null default 'pending',
    token text not null unique,
    created_at timestamptz not null default now(),
    confirmed_at timestamptz,
    last_notified_at timestamptz,
    last_notified_price double precision
  )`,
  `create unique index if not exists alerts_one_per_email on alerts (product_key, lower(email)) where status in ('pending', 'active')`,
  `create index if not exists alerts_status on alerts (status)`,
  `create table if not exists api_cache (
    key text primary key,
    value jsonb not null,
    expires_at timestamptz not null
  )`,
  `create table if not exists counters (
    bucket text primary key,
    count integer not null,
    reset_at timestamptz not null
  )`,
];

async function ensureSchema(sql: SqlClient): Promise<void> {
  const probe = (await sql.query(`select to_regclass('public.counters') as t`)) as unknown as { t: string | null }[];
  if (probe[0]?.t) return;
  for (const statement of SCHEMA) {
    await sql.query(statement);
  }
}

/** Runs a parameterized query ($1, $2, ...) and returns the rows. */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = getClient();
  if (!sql) throw new Error('DATABASE_URL is not set');
  if (!schemaReady) {
    schemaReady = ensureSchema(sql).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
  const rows = await sql.query(text, params);
  return rows as unknown as T[];
}

/** For tests: forget the cached client so a new DATABASE_URL is picked up. */
export function resetDbForTests(): void {
  client = undefined;
  schemaReady = null;
}
