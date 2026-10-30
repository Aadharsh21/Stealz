// "On sale" page tabs and types, shared by the server and the browser.

import type { CurrencyCode } from './types';

export const SALE_TABS = [
  { id: 'women', label: 'Women', noun: "women's clothing", query: "women's designer clothing" },
  { id: 'men', label: 'Men', noun: "men's clothing", query: "men's designer clothing" },
  { id: 'bags', label: 'Bags', noun: 'bags', query: 'designer handbags' },
  { id: 'sneakers', label: 'Sneakers', noun: 'sneakers', query: 'designer sneakers' },
  { id: 'accessories', label: 'Accessories', noun: 'accessories', query: 'designer accessories' },
  { id: 'kids', label: 'Kids', noun: "kids' clothing", query: 'kids clothing' },
] as const;

export type SaleTab = (typeof SALE_TABS)[number]['id'];

export interface SaleItem {
  title: string;
  brand?: string;
  image: string;
  /** Sale price at the cheapest store (before tax and delivery). */
  price: number;
  /** The store's regular price, when it shows one. */
  originalPrice?: number;
  /** Percent off; missing when the store marks the item as reduced without saying by how much. */
  pct?: number;
  currency: CurrencyCode;
  store: string;
  storeCount: number;
  ref: string;
}

export interface SaleResponse {
  tab: SaleTab;
  query: string;
  items: SaleItem[];
  checkedAt: string | null;
}

/** A store's markdowns across every sale tab, for the coupons page. */
export interface StoreSale {
  store: string;
  items: number;
  /** Biggest percent off among those items. */
  maxPct?: number;
  /** The tab with the most of this store's items, for the "See items" link. */
  tab: SaleTab;
  /** How many tabs have this store's items. */
  tabs: number;
}

export function isSaleTab(value: string | null | undefined): value is SaleTab {
  return SALE_TABS.some((t) => t.id === value);
}
