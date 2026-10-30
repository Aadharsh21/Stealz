// Product comparison: every store selling one product, with totals, delivery, deal score,
// price history and cheaper similar items.

import type { Listing, Offer, ProductDetails, ProductRef, ProductResponse, ResolvedLocation, UserLocation } from './types';
import { COUNTRIES } from './countries';
import { config, dataMode, ebayEnabled, emailEnabled, googleEnabled, hasDatabase } from './config';
import { cacheGet, cacheSet } from './cache';
import { wantedColorText } from './colors';
import { computeDealScore, markColorMismatches, markInflatedDiscounts, markLuxuryFloors, markPriceOutliers, summarizeHistory } from './deal';
import { AppError } from './errors';
import { getHistory, recordSnapshots, snapshotRows } from './history';
import { takeLiveCredit } from './limits';
import { locationKey, resolveLocation } from './location';
import { buildListings, flagSuspiciousListings, isUsedItem, itemToOffer, offerContext } from './normalize';
import { demoHistory, demoProduct } from './providers/demo';
import { searchEbay } from './providers/ebay';
import { googleProduct } from './providers/serpapi';
import { ProviderError } from './providers/types';
import { cleanStoreName, domainOf, isNotAnItem, looksCounterfeit } from './stores';
import { couponsFromItems } from './coupon-codes';
import { recordCoupons } from './coupons';
import { encodeRef } from './ref';
import type { ProviderItem, ProviderProductResult } from './providers/types';
import { cheapestOf, effectiveTotal, isFlagged } from './scoring';
import { checkVisitorLimit, getSearchItems } from './search';
import { jaccard, keyTokens, normalize, productKey } from './text';

interface RawProduct {
  details: Partial<ProductDetails>;
  items: ProviderItem[];
  notices: string[];
  demo: boolean;
  fetchedAt: string;
  cached: boolean;
}

function productCacheKey(ref: ProductRef, loc: UserLocation): string {
  return `product:v2:${loc.country}:${locationKey(loc)}:${ref.k}`;
}

/** Does this search item describe the same product as the reference? */
function sameProduct(item: ProviderItem, ref: ProductRef, country: string): boolean {
  if (productKey(country, item.title, item.productId) === ref.k) return true;
  if (ref.pid && item.productId === ref.pid) return true;
  return jaccard(keyTokens(item.title), keyTokens(ref.title)) >= 0.8;
}

function mergeItems(primary: ProviderItem[], extra: ProviderItem[]): ProviderItem[] {
  const stores = new Set(primary.map((i) => normalize(i.store)));
  const out = [...primary];
  for (const item of extra) {
    const s = normalize(item.store);
    if (stores.has(s)) continue;
    stores.add(s);
    out.push(item);
  }
  return out;
}

async function fetchLiveProduct(ref: ProductRef, loc: ResolvedLocation, ip: string): Promise<ProviderProductResult> {
  const search = await getSearchItems(ref.q, loc, ip, { cachedOnly: true }).catch(() => null);
  const fromSearch = (search?.items ?? []).filter((i) => sameProduct(i, ref, loc.country));

  if (ref.p === 'google' && ref.t && googleEnabled()) {
    await checkVisitorLimit(ip, 'product');
    await takeLiveCredit();
    try {
      const result = await googleProduct(ref.t);
      return { ...result, items: mergeItems(result.items, fromSearch) };
    } catch (err) {
      if (!(err instanceof ProviderError) || err.kind !== 'not_found') throw err;
      // The page token expired. Find the product again in a fresh search and retry once.
      const fresh = await getSearchItems(ref.q, loc, ip);
      const match = (fresh?.items ?? []).find((i) => i.pageToken && sameProduct(i, ref, loc.country));
      if (match?.pageToken && match.pageToken !== ref.t) {
        await takeLiveCredit();
        const result = await googleProduct(match.pageToken);
        return { ...result, items: mergeItems(result.items, fromSearch) };
      }
      if (fromSearch.length) return { details: {}, items: fromSearch, notices: ['Showing the stores from your search; full store details are unavailable.'] };
      throw err;
    }
  }

  if (fromSearch.length > 0) return { details: {}, items: fromSearch, notices: [] };
  if (ref.p === 'ebay' && ebayEnabled()) {
    await checkVisitorLimit(ip, 'product');
    const items = (await searchEbay(ref.title, loc, 20)).filter((i) => sameProduct(i, ref, loc.country));
    return { details: {}, items, notices: [] };
  }
  throw new AppError('This product link has expired. Search for it again to see current prices.', 404, 'not_found');
}

async function getProductItems(ref: ProductRef, loc: ResolvedLocation, ip: string, fresh = false): Promise<RawProduct> {
  if (ref.p === 'demo' || dataMode() === 'demo') {
    const r = demoProduct(ref, loc);
    if (!r) throw new AppError('This sample product could not be found.', 404, 'not_found');
    return { ...r, demo: true, fetchedAt: new Date().toISOString(), cached: false };
  }
  const key = productCacheKey(ref, loc);
  if (!fresh) {
    const cached = await cacheGet<RawProduct>(key);
    if (cached) return { ...cached, cached: true };
  }
  const result = await fetchLiveProduct(ref, loc, ip);
  const raw: RawProduct = { ...result, demo: false, fetchedAt: new Date().toISOString(), cached: false };
  if (raw.items.length > 0) await cacheSet(key, raw, Math.max(1, config().cacheTtlHours / 2) * 3600);
  return raw;
}

/** Normalized offers for a product, one per store (the cheapest if a store lists it twice). */
export function offersFromItems(items: ProviderItem[], loc: ResolvedLocation, now = new Date(), stats?: { fakes: number }): Offer[] {
  const base = offerContext(loc, now);
  const byStore = new Map<string, Offer>();
  for (const item of items) {
    if (!(item.price > 0) || isUsedItem(item) || isNotAnItem(item.title)) continue;
    if (looksCounterfeit(item.store, item.title, domainOf(item.link))) {
      if (stats) stats.fakes += 1;
      continue;
    }
    const offer = itemToOffer(item, base, loc.timeZone);
    const key = normalize(offer.store);
    const prev = byStore.get(key);
    if (!prev || effectiveTotal(offer) < effectiveTotal(prev)) byStore.set(key, offer);
  }
  return [...byStore.values()].sort((a, b) => effectiveTotal(a) - effectiveTotal(b));
}

export interface ProductInput {
  ref: ProductRef;
  location: UserLocation;
  tz?: string;
  ip: string;
  now?: Date;
  /** Skip the cache (used by the daily alert check). */
  fresh?: boolean;
}

export interface ProductOutcome {
  response: ProductResponse;
  background?: () => Promise<void>;
}

export async function runProduct(input: ProductInput): Promise<ProductOutcome> {
  const { ref } = input;
  const now = input.now ?? new Date();
  const loc = await resolveLocation(input.location, input.tz);
  const raw = await getProductItems(ref, loc, input.ip, input.fresh);

  const stats = { fakes: 0 };
  const checked = markPriceOutliers(markLuxuryFloors(offersFromItems(raw.items, loc, now, stats)));
  const wantedColor = wantedColorText(ref.q, ref.title, raw.details.title);
  let offers = markColorMismatches(checked.filter((o) => !isFlagged(o)), wantedColor);
  const notices = [...raw.notices];
  if (offers.length > 0 && offers.every((o) => o.colorNote)) {
    const [have, want] = (offers[0].colorNote as string).split(', not ');
    notices.unshift(`Every store here lists this in ${have.toLowerCase()}, not ${want}. Go back to the results to find the ${want} one.`);
  }
  const hiddenStores = stats.fakes + (checked.length - offers.length);
  if (offers.length === 0 && hiddenStores > 0) {
    throw new AppError("Every store selling this looks like a fake seller, so we're not showing it. Try searching again.", 404, 'not_found');
  }
  if (offers.length === 0) {
    throw new AppError('No stores have this item new right now. Try searching again.', 404, 'not_found');
  }
  const best = cheapestOf(offers) as Offer;

  // Price history: tracked snapshots, or generated history for demo products.
  let points = await getHistory(ref.k);
  let synthetic = false;
  if (points.length < 2 && raw.demo) {
    points = demoHistory(ref.k, best.total, loc.country, now);
    synthetic = true;
  }
  const history = points.length > 0 ? summarizeHistory(points, best.total, synthetic) : null;

  offers = markInflatedDiscounts(offers, history);
  const deal = computeDealScore(offers, history);

  // Cheaper similar items from the same search (no extra API calls).
  let similar: Listing[] = [];
  const search = await getSearchItems(ref.q, loc, input.ip, { cachedOnly: true, now }).catch(() => null);
  if (search) {
    const listings = flagSuspiciousListings(buildListings(search.items, ref.q, loc, now).listings);
    const seenKeys = new Set<string>([ref.k]);
    similar = listings
      .filter((l) => !isFlagged(l) && !seenKeys.has(l.productKey) && l.total < best.total * 0.98 && !sameProductListing(l, ref))
      .sort((a, b) => b.match - a.match || a.total - b.total)
      .filter((l) => (seenKeys.has(l.productKey) ? false : (seenKeys.add(l.productKey), true)))
      .slice(0, 6);
  }

  const images = [...(raw.details.images ?? []), ...(ref.img ? [ref.img] : []), ...offers.map((o) => o.image).filter((x): x is string => Boolean(x))];
  const product: ProductDetails = {
    key: ref.k,
    title: raw.details.title ?? ref.title,
    brand: raw.details.brand,
    images: [...new Set(images)].slice(0, 6),
    rating: raw.details.rating,
    reviews: raw.details.reviews,
    description: raw.details.description,
    features: raw.details.features,
  };

  const response: ProductResponse = {
    ref,
    product,
    offers,
    location: loc,
    currency: COUNTRIES[loc.country].currency,
    history,
    deal,
    similar,
    demo: raw.demo,
    cached: raw.cached,
    fetchedAt: raw.fetchedAt,
    notices,
    alertsEnabled: hasDatabase() && emailEnabled() && !raw.demo,
    hiddenStores,
  };

  const background = raw.cached || raw.demo
    ? undefined
    : async () => {
        await recordSnapshots(snapshotRows(ref.k, offers, input.fresh ? 'cron' : 'product'));
        // Promo codes the stores list for this product (only stores we show, never fake shops).
        const shown = new Set(offers.map((o) => normalize(o.store)));
        const codes = couponsFromItems(raw.items).filter((c) => shown.has(normalize(cleanStoreName(c.store))));
        await recordCoupons(loc.country, codes, encodeRef(ref));
        const { checkAlertsForProduct } = await import('./alerts');
        await checkAlertsForProduct(ref.k, offers, product, loc);
      };
  return { response, background };
}

function sameProductListing(l: Listing, ref: ProductRef): boolean {
  return jaccard(keyTokens(l.title), keyTokens(ref.title)) >= 0.8;
}
