// What each home page and sale tab shows, curated the way a store's category page is: the
// categories that belong, who they're for and, for clothing, an everyday price range per
// country. A "Women" tab is women's clothing, not perfume, handbags or a $3,000 coat.

import type { CountryCode } from './types';
import type { Shelf } from './category';
import { onShelf } from './category';
import type { PriceRange } from './search';

export interface TabShelf extends Shelf {
  /** Item price range per country, before tax and delivery. */
  price?: Record<CountryCode, readonly [min: number, max: number]>;
}

// Round numbers like the "Under $300" links stores use, per country rather than by exchange
// rate: everyday clothing costs less in India than a straight conversion from dollars says.
const CLOTHING_PRICE = { US: [20, 300], GB: [15, 250], AE: [75, 1100], IN: [500, 10000] } as const;
const KIDS_PRICE = { US: [10, 120], GB: [8, 100], AE: [35, 450], IN: [300, 4000] } as const;

export const SHELVES = {
  women: { groups: ['clothing'], department: 'women', price: CLOTHING_PRICE },
  men: { groups: ['clothing'], department: 'men', price: CLOTHING_PRICE },
  kids: { groups: ['clothing', 'shoes'], department: 'kids', price: KIDS_PRICE },
  bags: { groups: ['bags'], excludeTypes: ['Luggage'] },
  sneakers: { groups: ['shoes'], types: ['Sneakers', 'Shoes'] },
  accessories: { groups: ['accessories', 'jewelry'] },
} as const satisfies Record<string, TabShelf>;

export type ShelfId = keyof typeof SHELVES;

/** The tab's price range in this country, if it has one. */
export function shelfPrice(id: ShelfId, country: CountryCode): PriceRange | undefined {
  const shelf: TabShelf = SHELVES[id];
  const range = shelf.price?.[country];
  return range ? { min: range[0], max: range[1] } : undefined;
}

/** A check for whether an item belongs on the tab: right category, department and price. */
export function shelfFilter(id: ShelfId, country: CountryCode): (title: string, price: number) => boolean {
  const shelf: TabShelf = SHELVES[id];
  const range = shelfPrice(id, country);
  return (title, price) => onShelf(title, shelf) && (!range || (price >= range.min && price <= range.max));
}

/** Part of a cache key, so changing a tab's range or query starts it fresh. */
export function shelfKey(query: string, id: ShelfId, country: CountryCode): string {
  const range = shelfPrice(id, country);
  return range ? `${query}|${range.min}-${range.max}` : query;
}
