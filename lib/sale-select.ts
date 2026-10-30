// Chooses which marked-down products make the "On sale" page, and sums up sales by store.
// Pure logic, easy to test.

import { discountPercent } from './offer';
import type { CurrencyCode, Listing, ProductGroup } from './types';
import type { SaleItem, SaleTab, StoreSale } from './sale-tabs';

/** Percent off for a listing, or null when we can't tell or the discount looks inflated. */
export function saleDiscount(l: Listing): number | null {
  if (l.discountNote || l.priceWarning || l.colorNote) return null;
  return discountPercent(l.price, l.originalPrice) ?? l.discountPct ?? null;
}

/**
 * Up to `limit` sale items: has a photo, a real markdown of 10% or more (biggest first), at most
 * three per brand, stores before marketplaces. Items Google marks as on sale without saying by
 * how much come after the ones with a known discount.
 */
export function chooseSaleItems(groups: ProductGroup[], currency: CurrencyCode, limit = 30): SaleItem[] {
  const candidates: { item: SaleItem; marketplace: boolean }[] = [];
  for (const g of groups) {
    if (!g.image || !/^https:\/\//.test(g.image)) continue;
    const usable = g.listings.filter((l) => !l.colorNote && !l.discountNote && !l.priceWarning);
    if (usable.length === 0) continue;
    const priced = usable.map((l) => ({ l, pct: saleDiscount(l) }));
    const known = priced.filter((p) => p.pct != null && p.pct >= 10);
    const pool = known.length > 0 ? known : priced.filter((p) => p.pct == null);
    if (pool.length === 0) continue;
    const best = [...pool].sort((a, b) => a.l.price - b.l.price)[0];
    candidates.push({
      marketplace: g.listings.every((l) => l.isMarketplace),
      item: {
        title: g.title,
        brand: g.brand,
        image: g.image,
        price: best.l.price,
        originalPrice: best.l.originalPrice,
        pct: best.pct ?? undefined,
        currency,
        store: best.l.store,
        storeCount: g.storeCount,
        ref: g.ref,
      },
    });
  }
  candidates.sort((a, b) => Number(a.marketplace) - Number(b.marketplace) || (b.item.pct ?? -1) - (a.item.pct ?? -1));

  const perBrand = new Map<string, number>();
  const out: SaleItem[] = [];
  for (const c of candidates) {
    if (out.length >= limit) break;
    const brandKey = (c.item.brand ?? '').toLowerCase();
    if (brandKey && (perBrand.get(brandKey) ?? 0) >= 3) continue;
    out.push(c.item);
    if (brandKey) perBrand.set(brandKey, (perBrand.get(brandKey) ?? 0) + 1);
  }
  return out;
}

/** Stores with the most sale items across the tabs we have, biggest first. */
export function storeSales(byTab: Partial<Record<SaleTab, SaleItem[]>>, limit = 12): StoreSale[] {
  const stores = new Map<string, { store: string; items: number; maxPct?: number; tabs: Map<SaleTab, number> }>();
  for (const [tab, items] of Object.entries(byTab) as [SaleTab, SaleItem[] | undefined][]) {
    for (const it of items ?? []) {
      const key = it.store.toLowerCase();
      const s = stores.get(key) ?? { store: it.store, items: 0, tabs: new Map<SaleTab, number>() };
      s.items += 1;
      if (it.pct != null) s.maxPct = Math.max(s.maxPct ?? 0, it.pct);
      s.tabs.set(tab, (s.tabs.get(tab) ?? 0) + 1);
      stores.set(key, s);
    }
  }
  return [...stores.values()]
    .map((s) => ({
      store: s.store,
      items: s.items,
      maxPct: s.maxPct,
      tab: [...s.tabs.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.items - a.items || (b.maxPct ?? 0) - (a.maxPct ?? 0))
    .slice(0, limit);
}
