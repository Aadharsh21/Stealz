// "On sale" page data: one Google Shopping search per tab and country with Google's "On sale"
// filter. Results are reused for a week and only refreshed when someone opens that tab, so the
// page costs a handful of searches a month.

import type { CountryCode } from './types';
import { SALE_TABS } from './sale-tabs';
import type { SaleItem, SaleResponse, SaleTab, StoreSale } from './sale-tabs';
import { chooseSaleItems, storeSales } from './sale-select';
import { cacheGet, cacheSet } from './cache';
import { COUNTRIES } from './countries';
import { toAppError } from './errors';
import { runSearch } from './search';
import { hash32 } from './text';

const FRESH_MS = 7 * 86400 * 1000;
const KEEP_SECONDS = 30 * 86400;

interface StoredSale {
  items: SaleItem[];
  checkedAt: string;
}

function saleKey(country: CountryCode, def: (typeof SALE_TABS)[number]): string {
  return `sale:v1:${country}:${def.id}:${hash32(def.query)}`;
}

export async function getSale(tab: SaleTab, country: CountryCode): Promise<SaleResponse> {
  const def = SALE_TABS.find((t) => t.id === tab) ?? SALE_TABS[0];
  const key = saleKey(country, def);
  const stored = await cacheGet<StoredSale>(key);
  const fresh = stored && Date.now() - Date.parse(stored.checkedAt) < FRESH_MS;
  if (stored && fresh) return { tab, query: def.query, ...stored };

  // Only one visitor refreshes a stale tab; everyone else gets the stored sale meanwhile.
  const lockKey = `${key}:refreshing`;
  if (stored && (await cacheGet<boolean>(lockKey))) return { tab, query: def.query, ...stored };
  await cacheSet(lockKey, true, 120);

  try {
    const { response, background } = await runSearch({ query: def.query, location: { country, source: 'default' }, ip: 'sale-page', onSale: true });
    // Saves price history and any promo codes from this search.
    await background?.().catch((err) => console.error('[sale] background work failed', err));
    const items = chooseSaleItems(response.groups, COUNTRIES[country].currency);
    if (items.length >= 4 && !response.demo) {
      const next: StoredSale = { items, checkedAt: response.fetchedAt };
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

/** Which stores have the most markdowns, from the sale tabs already loaded. Never searches. */
export async function getStoreSales(country: CountryCode): Promise<{ stores: StoreSale[]; checkedAt: string | null }> {
  const byTab: Partial<Record<SaleTab, SaleItem[]>> = {};
  const dates: string[] = [];
  await Promise.all(
    SALE_TABS.map(async (def) => {
      const stored = await cacheGet<StoredSale>(saleKey(country, def));
      if (!stored) return;
      byTab[def.id] = stored.items;
      dates.push(stored.checkedAt);
    }),
  );
  dates.sort();
  return { stores: storeSales(byTab), checkedAt: dates[dates.length - 1] ?? null };
}
