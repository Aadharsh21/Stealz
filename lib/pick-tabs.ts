// Home page pick tabs and types, shared by the server and the browser.

import type { CurrencyCode } from './types';

export const PICK_TABS = [
  { id: 'women', label: 'Women', query: "women's designer handbags" },
  { id: 'men', label: 'Men', query: "men's designer jackets" },
  { id: 'kids', label: 'Kids', query: 'kids sneakers' },
  { id: 'sneakers', label: 'Sneakers', query: 'best selling sneakers' },
  { id: 'accessories', label: 'Accessories', query: 'designer accessories' },
] as const;

export type PickTab = (typeof PICK_TABS)[number]['id'];

export interface PickItem {
  title: string;
  brand?: string;
  image: string;
  /** Lowest item price across the stores we saw (before tax and shipping). */
  price: number;
  originalPrice?: number;
  currency: CurrencyCode;
  store: string;
  storeCount: number;
  ref: string;
}

export interface PicksResponse {
  tab: PickTab;
  query: string;
  items: PickItem[];
  checkedAt: string | null;
}

export function isPickTab(value: string | null): value is PickTab {
  return PICK_TABS.some((t) => t.id === value);
}
