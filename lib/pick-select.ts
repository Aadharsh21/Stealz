// Chooses which products from a search make good home page picks. Pure logic, easy to test.

import type { CurrencyCode, ProductGroup } from './types';
import type { PickItem } from './pick-tabs';

/** Up to 10 eye-catching products: has a photo, a mix of brands, stores before marketplaces. */
export function choosePicks(groups: ProductGroup[], currency: CurrencyCode): PickItem[] {
  const perBrand = new Map<string, number>();
  const picks: PickItem[] = [];
  const ranked = [...groups].sort((a, b) => {
    const aMarket = a.listings.every((l) => l.isMarketplace) ? 1 : 0;
    const bMarket = b.listings.every((l) => l.isMarketplace) ? 1 : 0;
    return aMarket - bMarket;
  });
  for (const g of ranked) {
    if (picks.length >= 10) break;
    if (!g.image || !/^https:\/\//.test(g.image)) continue;
    const listings = g.listings.filter((l) => !l.colorNote);
    if (listings.length === 0) continue;
    const brandKey = (g.brand ?? '').toLowerCase();
    if (brandKey && (perBrand.get(brandKey) ?? 0) >= 2) continue;
    const cheapest = [...listings].sort((a, b) => a.price - b.price)[0];
    picks.push({
      title: g.title,
      brand: g.brand,
      image: g.image,
      price: cheapest.price,
      originalPrice: cheapest.originalPrice && !cheapest.discountNote ? cheapest.originalPrice : undefined,
      currency,
      store: cheapest.store,
      storeCount: g.storeCount,
      ref: g.ref,
    });
    if (brandKey) perBrand.set(brandKey, (perBrand.get(brandKey) ?? 0) + 1);
  }
  return picks;
}
