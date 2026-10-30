// Home page picks: a few real, in-stock products per tab, from one live search per tab and
// country. Picks are reused for two weeks, so they cost a handful of searches a month.

import type { CountryCode } from './types';
import { PICK_TABS } from './pick-tabs';
import type { PickItem, PickTab, PicksResponse } from './pick-tabs';
import { choosePicks } from './pick-select';
import { cacheGet, cacheSet } from './cache';
import { COUNTRIES } from './countries';
import { toAppError } from './errors';
import { runSearch } from './search';
import { detectBrand } from './text';

const FRESH_MS = 14 * 86400 * 1000;
const KEEP_SECONDS = 60 * 86400;

interface StoredPicks {
  items: PickItem[];
  checkedAt: string;
}

export async function getPicks(tab: PickTab, country: CountryCode): Promise<PicksResponse> {
  const def = PICK_TABS.find((t) => t.id === tab) ?? PICK_TABS[0];
  const key = `picks:v1:${country}:${tab}`;
  const saved = await cacheGet<StoredPicks>(key);
  // Brand names are re-read so saved picks benefit from newly recognized brands.
  const stored = saved && { ...saved, items: saved.items.map((p) => ({ ...p, brand: p.brand ?? detectBrand(p.title) })) };
  const fresh = stored && Date.now() - Date.parse(stored.checkedAt) < FRESH_MS;
  if (stored && fresh) return { tab, query: def.query, ...stored };

  // Only one visitor refreshes a stale tab; everyone else gets the stored picks meanwhile.
  const lockKey = `${key}:refreshing`;
  if (stored && (await cacheGet<boolean>(lockKey))) return { tab, query: def.query, ...stored };
  await cacheSet(lockKey, true, 120);

  try {
    const { response } = await runSearch({ query: def.query, location: { country, source: 'default' }, ip: 'home-picks' });
    const items = choosePicks(response.groups, COUNTRIES[country].currency);
    if (items.length >= 4 && !response.demo) {
      const next: StoredPicks = { items, checkedAt: response.fetchedAt };
      await cacheSet(key, next, KEEP_SECONDS);
      return { tab, query: def.query, ...next };
    }
    if (stored) return { tab, query: def.query, ...stored };
    return { tab, query: def.query, items, checkedAt: response.demo ? null : response.fetchedAt };
  } catch (err) {
    if (stored) return { tab, query: def.query, ...stored };
    throw toAppError(err);
  }
}
