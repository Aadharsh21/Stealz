// Turns raw provider items into offers and search listings, groups listings that are the
// same product, and picks the cheapest / fastest / best-value listing.

import type { Listing, Offer, ProductGroup, ProductRef, ResolvedLocation, SearchSummary } from './types';
import type { ProviderItem } from './providers/types';
import { COUNTRIES } from './countries';
import {
  dayFromTimestamp, estimateFromDays, interpretDetails, makeContext, makeShipping, parseShippingField,
} from './delivery';
import { finalizeOffer } from './offer';
import type { OfferContext } from './offer';
import { encodeRef } from './ref';
import { markLuxuryFloors, markPriceOutliers } from './deal';
import { cheapestOf, explainPick, fastestOf, rankOffers } from './scoring';
import { isNotAnItem, isResaleStore, looksUsed } from './stores';
import { exactTax } from './tax';
import { CLOSE_MATCH, detectBrand, jaccard, keyTokens, matchScore, productKey, truncate } from './text';

export function offerContext(loc: ResolvedLocation, now: Date = new Date()): OfferContext {
  const base = makeContext(loc.country, loc.timeZone, undefined, now);
  return { ...base, currency: COUNTRIES[loc.country].currency, regionCode: loc.regionCode, postalCode: loc.postalCode };
}

/** True when an item should be hidden because it isn't new. */
export function isUsedItem(item: ProviderItem): boolean {
  return looksUsed(item.title, item.condition) || isResaleStore(item.store);
}

export function itemToOffer(item: ProviderItem, base: OfferContext, timeZone: string): Offer {
  const ctx: OfferContext = { ...base, price: item.price };
  const details = interpretDetails(item.notes, ctx);
  let shipping = parseShippingField(item.shippingField, item.shippingExtracted, ctx) ?? details.shipping;
  if (item.shippingCost != null) shipping = makeShipping(ctx, item.shippingCost);
  let delivery = details.delivery;
  if (item.deliveryWindow) {
    const a = dayFromTimestamp(item.deliveryWindow.min, timeZone);
    const b = dayFromTimestamp(item.deliveryWindow.max, timeZone);
    const lo = a ?? b;
    const hi = b ?? a;
    if (lo != null && hi != null) delivery = estimateFromDays(lo, hi, ctx, 'Seller delivery estimate');
  }
  return finalizeOffer(
    {
      source: item.source,
      store: item.store,
      link: item.link,
      storeLogo: item.storeLogo,
      title: item.title,
      image: item.image,
      price: item.price,
      originalPrice: item.originalPrice,
      shipping,
      tax: item.taxAmount != null ? exactTax(item.taxAmount) : null,
      providerTotal: item.providerTotal,
      delivery,
      returns: details.returns,
      rating: item.rating,
      reviews: item.reviews,
      inStock: details.inStock,
      coupon: item.coupon,
      paymentNote: item.paymentNote,
      sellerNote: item.sellerNote,
      nearby: item.nearby,
      brand: detectBrand(item.title),
      tags: [...(item.tags ?? []), ...(item.sponsored ? ['Sponsored'] : [])],
    },
    ctx,
  );
}

export interface BuiltListings {
  listings: Listing[];
  hiddenUsed: number;
}

export function buildListings(items: ProviderItem[], query: string, loc: ResolvedLocation, now: Date = new Date()): BuiltListings {
  const base = offerContext(loc, now);
  const listings: Listing[] = [];
  const seen = new Set<string>();
  let hiddenUsed = 0;
  for (const item of items) {
    if (!item.title || !(item.price > 0) || isNotAnItem(item.title)) continue;
    if (isUsedItem(item)) {
      hiddenUsed += 1;
      continue;
    }
    const offer = itemToOffer(item, base, loc.timeZone);
    const dedupe = `${offer.store.toLowerCase()}|${keyTokens(offer.title).join(' ')}|${offer.price}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const key = productKey(loc.country, item.title, item.productId);
    const ref: ProductRef = {
      v: 1,
      p: item.source,
      k: key,
      q: query,
      title: truncate(offer.title, 160),
      img: item.image,
      t: item.pageToken,
      pid: item.productId,
    };
    listings.push({
      ...offer,
      productKey: key,
      brand: detectBrand(item.title),
      match: matchScore(query, item.title),
      ref: encodeRef(ref),
      multipleSources: item.multipleSources,
      googleLink: item.googleLink,
    });
  }
  return { listings, hiddenUsed };
}

function tier(match: number): number {
  return match >= 0.99 ? 0 : match >= 0.75 ? 1 : 2;
}

/**
 * Groups listings that are the same product. Google listings share a product id; other
 * listings (eBay, ads) join a group when their titles are nearly identical.
 */
export function groupListings(listings: Listing[]): ProductGroup[] {
  interface Draft {
    key: string;
    order: number;
    tokens: string[];
    brand?: string;
    items: Listing[];
  }
  const drafts: Draft[] = [];
  const byKey = new Map<string, Draft>();
  listings.forEach((listing, index) => {
    let draft = byKey.get(listing.productKey);
    if (!draft && !listing.productKey.includes(':g:')) {
      const toks = keyTokens(listing.title);
      draft = drafts.find(
        (d) => (d.brand ?? '') === (listing.brand ?? '') && jaccard(d.tokens, toks) >= 0.8,
      );
    }
    if (!draft) {
      draft = { key: listing.productKey, order: index, tokens: keyTokens(listing.title), brand: listing.brand, items: [] };
      drafts.push(draft);
      byKey.set(listing.productKey, draft);
    }
    draft.items.push(listing);
  });

  const groups = drafts.map((d): ProductGroup => {
    const items = [...d.items].sort((a, b) => a.total - b.total);
    const lead = [...d.items].sort((a, b) => b.match - a.match)[0];
    const withToken = d.items.find((l) => l.source === 'google' && l.ref) ?? d.items[0];
    const stores = new Set(items.map((l) => l.store.toLowerCase()));
    return {
      key: d.key,
      title: lead.title,
      brand: lead.brand,
      image: d.items.find((l) => l.image)?.image,
      listings: items,
      bestTotal: items[0].total,
      maxTotal: items[items.length - 1].total,
      storeCount: stores.size,
      fastest: fastestOf(items),
      match: lead.match,
      ref: withToken.ref,
      multipleSources: d.items.some((l) => l.multipleSources),
      onSale: d.items.some((l) => l.originalPrice != null && !l.discountNote),
    };
  });
  const order = new Map(drafts.map((d) => [d.key, d.order]));
  return groups.sort((a, b) => tier(a.match) - tier(b.match) || (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
}

/**
 * Flags close matches priced far below the others. Skipped for broad searches (like "black
 * tote") where close matches are many different products at very different prices.
 */
export function flagSuspiciousListings(input: Listing[]): Listing[] {
  const listings = markLuxuryFloors(input);
  const close = listings.filter((l) => l.match >= CLOSE_MATCH);
  if (close.length < 5) return listings;
  const prices = close.map((l) => l.price).sort((a, b) => a - b);
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  if (q1 <= 0 || q3 / q1 > 2.5) return listings;
  const flagged = new Map(markPriceOutliers(close).filter((l) => l.priceWarning).map((l) => [l.id, l]));
  return flagged.size ? listings.map((l) => flagged.get(l.id) ?? l) : listings;
}

/** Cheapest, fastest and best-value listing, preferring listings that closely match the search. */
export function summarize(listings: Listing[]): SearchSummary {
  const exact = listings.filter((l) => l.match >= CLOSE_MATCH);
  const scope: 'exact' | 'all' = exact.length >= 2 ? 'exact' : 'all';
  const pool = scope === 'exact' ? exact : listings;
  if (pool.length === 0) return { scope };
  const cheapest = cheapestOf(pool);
  const fastest = fastestOf(pool);
  const bestValue = rankOffers(pool)[0]?.offer;
  return {
    cheapest,
    fastest,
    bestValue,
    bestValueReason: bestValue ? explainPick(bestValue, cheapest, fastest) : undefined,
    scope,
  };
}

export function storeCounts(listings: Listing[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of listings) counts.set(l.store, (counts.get(l.store) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
