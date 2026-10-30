// Browser-side helpers for calling the API.

import type { ApiError, ResolvedLocation, UserLocation } from './types';

export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** Query parameters describing the shopper's location, sent with every price request. */
export function locationParams(loc: UserLocation | ResolvedLocation | null): URLSearchParams {
  const p = new URLSearchParams();
  if (!loc) return p;
  p.set('country', loc.country);
  if (loc.postalCode) p.set('postal', loc.postalCode);
  if (loc.city) p.set('city', loc.city);
  if (loc.region) p.set('region', loc.region);
  if (loc.regionCode) p.set('regionCode', loc.regionCode);
  p.set('source', loc.source);
  const tz = browserTimeZone();
  if (tz) p.set('tz', tz);
  return p;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ApiError['code'] | 'network',
  ) {
    super(message);
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { accept: 'application/json' } });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiClientError("Couldn't reach Stealz. Check your connection and try again.", 0, 'network');
  }
  const body = (await res.json().catch(() => null)) as (T & Partial<ApiError>) | null;
  if (!res.ok || !body) {
    throw new ApiClientError(body?.error ?? 'Something went wrong. Please try again.', res.status, body?.code ?? 'server');
  }
  return body as T;
}

export async function postJson<T>(url: string, data: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  } catch {
    throw new ApiClientError("Couldn't reach Stealz. Check your connection and try again.", 0, 'network');
  }
  const body = (await res.json().catch(() => null)) as (T & Partial<ApiError>) | null;
  if (!res.ok || !body) {
    throw new ApiClientError(body?.error ?? 'Something went wrong. Please try again.', res.status, body?.code ?? 'server');
  }
  return body as T;
}

/** "2 hours ago", "just now" */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
