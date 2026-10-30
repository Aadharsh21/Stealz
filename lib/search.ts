// Search: fetch listings from the configured sources (with caching, rate limits and the
// live-search budget), then normalize, group and summarize them.

import type { ResolvedLocation, SearchResponse, UserLocation } from './types';
import { COUNTRIES } from './countries';
import { config, dataMode, ebayEnabled, googleEnabled } from './config';
import { cacheGet, cacheSet } from './cache';
import { AppError, secondsUntil } from './errors';
import { recordSnapshots, snapshotRows } from './history';
import { hitCounter, takeLiveCredit } from './limits';
import { locationKey, resolveLocation } from './location';
import { buildListings, flagSuspiciousListings, groupListings, storeCounts, summarize } from './normalize';
import { demoSearch } from './providers/demo';
import { searchEbay } from './providers/ebay';
import { searchGoogleShopping } from './providers/serpapi';
import type { ProviderItem } from './providers/types';
import { isFlagged } from './scoring';
import { normalize } from './text';

export interface RawSearch {
  items: ProviderItem[];
  sources: string[];
  notices: string[];
  demo: boolean;
  fetchedAt: string;
  cached: boolean;
}

export function cleanQuery(input: string): string {
  return input.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function searchCacheKey(query: string, loc: UserLocation): string {
  return `search:v2:${loc.country}:${locationKey(loc)}:${normalize(query)}`;
}

/** Per-visitor rate limit for anything that costs a live API call. */
export async function checkVisitorLimit(ip: string, kind: 'search' | 'product'): Promise<void> {
  const perHour = config().searchesPerIpPerHour;
  const limit = kind === 'search' ? perHour : perHour * 2;
  const result = await hitCounter(`ip:${kind}:${ip}`, limit, 3600);
  if (!result.ok) {
    throw new AppError("You're searching faster than we can check prices. Please wait a few minutes.", 429, 'rate_limited', secondsUntil(result.resetAt));
  }
}

/** Raw items for a search, from cache when possible. Set `cachedOnly` to skip live calls. */
export async function getSearchItems(
  query: string,
  loc: ResolvedLocation,
  ip: string,
  opts: { cachedOnly?: boolean; now?: Date } = {},
): Promise<RawSearch | null> {
  const mode = dataMode();
  if (mode === 'none') throw new AppError('No shopping data source is configured yet.', 500, 'server');
  if (mode === 'demo') {
    const r = demoSearch(query, loc, opts.now);
    return { items: r.items, sources: r.sources, notices: r.notices, demo: true, fetchedAt: new Date().toISOString(), cached: false };
  }

  const key = searchCacheKey(query, loc);
  const cached = await cacheGet<RawSearch>(key);
  if (cached) return { ...cached, cached: true };
  if (opts.cachedOnly) return null;

  await checkVisitorLimit(ip, 'search');
  const useGoogle = googleEnabled();
  const useEbay = ebayEnabled() && loc.country === 'US';
  if (!useGoogle && !useEbay) {
    return { items: [], sources: [], notices: [`Live results for ${COUNTRIES[loc.country].name} aren't set up yet.`], demo: false, fetchedAt: new Date().toISOString(), cached: false };
  }
  if (useGoogle) await takeLiveCredit();

  const [google, ebay] = await Promise.allSettled([
    useGoogle ? searchGoogleShopping(query, loc) : Promise.resolve(null),
    useEbay ? searchEbay(query, loc) : Promise.resolve([] as ProviderItem[]),
  ]);

  const items: ProviderItem[] = [];
  const sources: string[] = [];
  const notices: string[] = [];
  if (google.status === 'fulfilled' && google.value) {
    items.push(...google.value.items);
    sources.push(...google.value.sources);
    notices.push(...google.value.notices);
  }
  if (ebay.status === 'fulfilled' && ebay.value.length > 0) {
    items.push(...ebay.value);
    sources.push('eBay');
  } else if (ebay.status === 'rejected') {
    console.error('[search] eBay failed', ebay.reason);
  }
  if (google.status === 'rejected') {
    if (items.length === 0) throw google.reason;
    console.error('[search] Google Shopping failed', google.reason);
    notices.push("Google Shopping results couldn't be loaded, so you're seeing eBay only.");
  }

  const result: RawSearch = { items, sources, notices, demo: false, fetchedAt: new Date().toISOString(), cached: false };
  if (items.length > 0) await cacheSet(key, result, config().cacheTtlHours * 3600);
  return result;
}

export interface SearchInput {
  query: string;
  location: UserLocation;
  tz?: string;
  ip: string;
  now?: Date;
}

export interface SearchOutcome {
  response: SearchResponse;
  /** Work to run after the response is sent (saving price snapshots). */
  background?: () => Promise<void>;
}

export async function runSearch(input: SearchInput): Promise<SearchOutcome> {
  const query = cleanQuery(input.query);
  if (query.length < 2) throw new AppError('Type at least 2 characters to search.', 400, 'bad_request');
  const now = input.now ?? new Date();
  const loc = await resolveLocation(input.location, input.tz);
  const raw = (await getSearchItems(query, loc, input.ip, { now })) as RawSearch;
  const built = buildListings(raw.items, query, loc, now);
  // Originals only: listings that look fake (copy shops, fake-shop domains, prices no genuine
  // item sells for) are left out entirely, not just labelled.
  const checked = flagSuspiciousListings(built.listings);
  const listings = checked.filter((l) => !isFlagged(l));
  const hiddenUsed = built.hiddenUsed;
  const hiddenFakes = built.hiddenFakes + (checked.length - listings.length);
  const groups = groupListings(listings);
  const response: SearchResponse = {
    query,
    location: loc,
    currency: COUNTRIES[loc.country].currency,
    groups,
    listings,
    summary: summarize(listings),
    stores: storeCounts(listings),
    sources: raw.sources,
    demo: raw.demo,
    cached: raw.cached,
    fetchedAt: raw.fetchedAt,
    notices: raw.notices,
    hiddenUsed,
    hiddenFakes,
  };
  const background =
    raw.cached || raw.demo
      ? undefined
      : async () => {
          const rows = groups.flatMap((g) => snapshotRows(g.key, g.listings, 'search'));
          await recordSnapshots(rows);
        };
  return { response, background };
}
