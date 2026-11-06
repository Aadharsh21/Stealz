// Filtering and sorting of search results in the browser (no extra API calls). The filters
// follow what big fashion stores offer (category, department, price ranges, brand), worked out
// from the results themselves.

import type { CurrencyCode, Listing, ProductGroup } from './types';
import type { Department } from './category';
import { formatMoney } from './money';
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
  /** Category names, e.g. "Dresses". */
  categories: string[];
  departments: Department[];
  brands: string[];
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
  categories: [],
  departments: [],
  brands: [],
};

export function activeFilterCount(f: ResultFilters): number {
  return (
    Number(f.freeShipping) +
    Number(f.maxDays != null) +
    Number(f.onSale) +
    Number(f.hideMarketplaces) +
    Number(f.exactOnly) +
    Number(f.stores.length > 0) +
    Number(f.minPrice != null || f.maxPrice != null) +
    Number(f.categories.length > 0) +
    Number(f.departments.length > 0) +
    Number(f.brands.length > 0)
  );
}

/** Unisex items count for both women and men, as they do in stores. */
function departmentPasses(d: Department | undefined, wanted: Department[]): boolean {
  if (!d) return false;
  if (wanted.includes(d)) return true;
  return d === 'unisex' && (wanted.includes('women') || wanted.includes('men'));
}

export function listingPasses(l: Listing, f: ResultFilters): boolean {
  if (f.freeShipping && !l.shipping.free) return false;
  if (f.maxDays != null && (l.delivery.maxDays == null || l.delivery.maxDays > f.maxDays)) return false;
  if (f.onSale && ((l.originalPrice == null && l.discountPct == null) || l.discountNote)) return false;
  if (f.hideMarketplaces && (l.isMarketplace || isFlagged(l))) return false;
  if (f.exactOnly && l.match < 0.99) return false;
  if (f.stores.length > 0 && !f.stores.includes(l.store)) return false;
  if (f.minPrice != null && l.total < f.minPrice) return false;
  if (f.maxPrice != null && l.total > f.maxPrice) return false;
  if (f.categories.length > 0 && (!l.category || !f.categories.includes(l.category))) return false;
  if (f.departments.length > 0 && !departmentPasses(l.department, f.departments)) return false;
  if (f.brands.length > 0 && (!l.brand || !f.brands.includes(l.brand))) return false;
  return true;
}

export interface FacetValue<T extends string = string> {
  value: T;
  /** How many products have it. */
  count: number;
}

export interface PriceBucket {
  label: string;
  min: number | null;
  max: number | null;
  count: number;
}

export interface Facets {
  categories: FacetValue[];
  departments: FacetValue<Department>[];
  brands: FacetValue[];
  prices: PriceBucket[];
}

// Round price points, per currency, that price ranges are cut at ("$50 to $100").
const PRICE_POINTS: Record<CurrencyCode, number[]> = {
  USD: [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000],
  GBP: [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000],
  AED: [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000],
  INR: [500, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 25000, 50000, 75000, 100000, 200000],
};

const DEPARTMENT_ORDER: Department[] = ['women', 'men', 'kids', 'unisex'];

export const DEPARTMENT_LABELS: Record<Department, string> = { women: 'Women', men: 'Men', kids: 'Kids', unisex: 'Unisex' };

function countBy<T extends string>(groups: ProductGroup[], valuesOf: (l: Listing) => T | undefined): FacetValue<T>[] {
  const counts = new Map<T, number>();
  for (const g of groups) {
    const seen = new Set<T>();
    for (const l of g.listings) {
      const v = valuesOf(l);
      if (v && !seen.has(v)) seen.add(v);
    }
    for (const v of seen) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/**
 * Up to five price ranges that split these products into similar-sized sets, cut at round
 * numbers: "Under $50", "$50 to $100", ... "$300 and up".
 */
export function priceBuckets(groups: ProductGroup[], currency: CurrencyCode): PriceBucket[] {
  const totals = groups.map((g) => g.bestTotal).filter((t) => t > 0).sort((a, b) => a - b);
  if (totals.length < 4) return [];
  const lo = totals[0];
  const hi = totals[totals.length - 1];
  const points = PRICE_POINTS[currency].filter((p) => p > lo && p < hi);
  const cuts = new Set<number>();
  for (const q of [0.2, 0.4, 0.6, 0.8]) {
    const target = totals[Math.floor(q * (totals.length - 1))];
    let best: number | undefined;
    for (const p of points) if (best == null || Math.abs(Math.log(p / target)) < Math.abs(Math.log(best / target))) best = p;
    if (best != null) cuts.add(best);
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const money = (n: number) => formatMoney(n, currency, { compact: true });
  const ranges: { label: string; min: number | null; max: number | null }[] = [
    { label: `Under ${money(sorted[0])}`, min: null, max: sorted[0] },
    ...sorted.slice(1).map((p, i) => ({ label: `${money(sorted[i])} to ${money(p)}`, min: sorted[i], max: p })),
    { label: `${money(sorted[sorted.length - 1])} and up`, min: sorted[sorted.length - 1], max: null },
  ];
  return ranges
    .map((r) => ({
      ...r,
      count: groups.filter((g) => g.listings.some((l) => (r.min == null || l.total >= r.min) && (r.max == null || l.total <= r.max))).length,
    }))
    .filter((r) => r.count > 0);
}

/** The filter options these results support, with how many products each one has. */
export function buildFacets(groups: ProductGroup[], currency: CurrencyCode): Facets {
  const departments = countBy(groups, (l) => l.department);
  departments.sort((a, b) => DEPARTMENT_ORDER.indexOf(a.value) - DEPARTMENT_ORDER.indexOf(b.value));
  return {
    categories: countBy(groups, (l) => l.category),
    departments,
    brands: countBy(groups, (l) => l.brand),
    prices: priceBuckets(groups, currency),
  };
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
