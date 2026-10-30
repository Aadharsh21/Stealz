// Filtering and sorting of search results in the browser (no extra API calls).

import type { Listing, ProductGroup } from './types';
import { cheapestOf, effectiveDays, effectiveTotal, fastestOf, isFlagged, rankOffers } from './scoring';
import { discountPercent } from './offer';
import { CLOSE_MATCH } from './text';

export interface ResultFilters {
  freeShipping: boolean;
  maxDays: number | null;
  onSale: boolean;
  hideMarketplaces: boolean;
  exactOnly: boolean;
  stores: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export type SortKey = 'relevance' | 'total' | 'fastest' | 'value' | 'discount';

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Best match',
  total: 'Lowest total',
  fastest: 'Fastest delivery',
  value: 'Best value',
  discount: 'Biggest discount',
};

export const DEFAULT_FILTERS: ResultFilters = {
  freeShipping: false,
  maxDays: null,
  onSale: false,
  hideMarketplaces: false,
  exactOnly: false,
  stores: [],
  minPrice: null,
  maxPrice: null,
};

export function activeFilterCount(f: ResultFilters): number {
  return (
    Number(f.freeShipping) +
    Number(f.maxDays != null) +
    Number(f.onSale) +
    Number(f.hideMarketplaces) +
    Number(f.exactOnly) +
    Number(f.stores.length > 0) +
    Number(f.minPrice != null || f.maxPrice != null)
  );
}

export function listingPasses(l: Listing, f: ResultFilters): boolean {
  if (f.freeShipping && !l.shipping.free) return false;
  if (f.maxDays != null && (l.delivery.maxDays == null || l.delivery.maxDays > f.maxDays)) return false;
  if (f.onSale && (l.originalPrice == null || l.discountNote)) return false;
  if (f.hideMarketplaces && (l.isMarketplace || isFlagged(l))) return false;
  if (f.exactOnly && l.match < 0.99) return false;
  if (f.stores.length > 0 && !f.stores.includes(l.store)) return false;
  if (f.minPrice != null && l.total < f.minPrice) return false;
  if (f.maxPrice != null && l.total > f.maxPrice) return false;
  return true;
}

function bestDiscount(listings: Listing[]): number {
  return Math.max(0, ...listings.map((l) => (l.discountNote ? 0 : discountPercent(l.price, l.originalPrice) ?? 0)));
}

export function filterGroups(groups: ProductGroup[], f: ResultFilters, sort: SortKey): ProductGroup[] {
  const out: ProductGroup[] = [];
  for (const g of groups) {
    const listings = g.listings.filter((l) => listingPasses(l, f));
    if (listings.length === 0) continue;
    const sorted = [...listings].sort((a, b) => effectiveTotal(a) - effectiveTotal(b));
    out.push({
      ...g,
      listings: sorted,
      bestTotal: sorted[0].total,
      maxTotal: sorted[sorted.length - 1].total,
      storeCount: new Set(sorted.map((l) => l.store.toLowerCase())).size,
      fastest: fastestOf(sorted),
    });
  }
  const order = new Map(groups.map((g, i) => [g.key, i]));
  const byOrder = (a: ProductGroup, b: ProductGroup) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0);
  switch (sort) {
    case 'total':
      return out.sort((a, b) => effectiveTotal(a.listings[0]) - effectiveTotal(b.listings[0]) || byOrder(a, b));
    case 'fastest':
      return out.sort((a, b) => {
        const da = a.fastest ? effectiveDays(a.fastest) : 99;
        const db = b.fastest ? effectiveDays(b.fastest) : 99;
        return da - db || a.bestTotal - b.bestTotal;
      });
    case 'discount':
      return out.sort((a, b) => bestDiscount(b.listings) - bestDiscount(a.listings) || byOrder(a, b));
    case 'value': {
      const reps = out.map((g) => rankOffers(g.listings)[0]?.offer ?? g.listings[0]);
      const ranked = rankOffers(reps).map((r) => r.offer.id);
      const pos = new Map(ranked.map((id, i) => [id, i]));
      return out.sort((a, b) => {
        const ra = rankOffers(a.listings)[0]?.offer.id ?? '';
        const rb = rankOffers(b.listings)[0]?.offer.id ?? '';
        return (pos.get(ra) ?? 99) - (pos.get(rb) ?? 99);
      });
    }
    default:
      return out.sort(byOrder);
  }
}

export function filterListings(listings: Listing[], f: ResultFilters, sort: SortKey): Listing[] {
  const list = listings.filter((l) => listingPasses(l, f));
  switch (sort) {
    case 'total':
      return list.sort((a, b) => effectiveTotal(a) - effectiveTotal(b));
    case 'fastest':
      return list.sort((a, b) => effectiveDays(a) - effectiveDays(b) || effectiveTotal(a) - effectiveTotal(b));
    case 'discount':
      return list.sort((a, b) => bestDiscount([b]) - bestDiscount([a]));
    case 'value':
      return rankOffers(list).map((r) => r.offer);
    default:
      return list;
  }
}

/**
 * Cheapest visible listing, used for the "Lowest total" sticker. When the search has close
 * matches, only those compete, so the sticker never lands on a different, cheaper product.
 */
export function cheapestListing(groups: ProductGroup[], scope: 'exact' | 'all' = 'all'): Listing | undefined {
  const all = groups.flatMap((g) => g.listings);
  const pool = scope === 'exact' ? all.filter((l) => l.match >= CLOSE_MATCH) : all;
  return cheapestOf(pool.length > 0 ? pool : all);
}
