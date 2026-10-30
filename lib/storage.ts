// Browser storage for things that belong to one shopper: their location, recent searches and
// watchlist. No accounts, so nothing here leaves the device. Every access is guarded because
// storage can be unavailable (private browsing, blocked cookies).

import type { CurrencyCode, ResolvedLocation } from './types';

const KEYS = {
  location: 'stealz:location:v1',
  recent: 'stealz:recent:v1',
  watchlist: 'stealz:watchlist:v1',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the feature just won't persist
  }
}

export function loadLocation(): ResolvedLocation | null {
  const loc = read<ResolvedLocation | null>(KEYS.location, null);
  return loc && typeof loc === 'object' && 'country' in loc && 'label' in loc ? loc : null;
}

export function saveLocation(loc: ResolvedLocation): void {
  write(KEYS.location, loc);
}

export function loadRecentSearches(): string[] {
  const list = read<unknown>(KEYS.recent, []);
  return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string').slice(0, 8) : [];
}

export function addRecentSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  const list = loadRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
  write(KEYS.recent, [q, ...list].slice(0, 8));
}

export function clearRecentSearches(): void {
  write(KEYS.recent, []);
}

export interface WatchItem {
  ref: string;
  key: string;
  title: string;
  image?: string;
  savedTotal: number;
  currency: CurrencyCode;
  store: string;
  country: string;
  savedAt: string;
  /** Latest total seen when the shopper reopened it. */
  lastTotal?: number;
  lastCheckedAt?: string;
}

export function loadWatchlist(): WatchItem[] {
  const list = read<unknown>(KEYS.watchlist, []);
  return Array.isArray(list) ? (list as WatchItem[]).filter((w) => w && typeof w.ref === 'string') : [];
}

export function saveWatchlist(items: WatchItem[]): void {
  write(KEYS.watchlist, items.slice(0, 50));
  try {
    window.dispatchEvent(new Event('stealz:watchlist'));
  } catch {
    // ignore
  }
}

export function isWatched(key: string): boolean {
  return loadWatchlist().some((w) => w.key === key);
}

export function toggleWatch(item: WatchItem): boolean {
  const list = loadWatchlist();
  const exists = list.some((w) => w.key === item.key);
  saveWatchlist(exists ? list.filter((w) => w.key !== item.key) : [item, ...list]);
  return !exists;
}

export function updateWatchPrice(key: string, total: number): void {
  const list = loadWatchlist();
  let changed = false;
  for (const w of list) {
    if (w.key === key && w.lastTotal !== total) {
      w.lastTotal = total;
      w.lastCheckedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveWatchlist(list);
}
