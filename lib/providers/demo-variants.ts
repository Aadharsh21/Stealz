// Development-only sample data variants, for checking layouts against the data real stores
// send rather than the kind data the demo catalog makes. Switched with the "Demo data /
// Worst case / Empty" control at the bottom of the page in `next dev` (a cookie), and inert
// everywhere else: production never reads it, and live data never passes through here.

import type { CountryCode, ProductRef } from '../types';
import { demoCatalog } from './demo';
import type { ProviderItem, ProviderProductResult, ProviderSearchResult } from './types';

export type DemoVariant = 'demo' | 'worst' | 'empty';

/** The variant chosen in the dev toolbar, or "demo". Never anything else outside `next dev`. */
export async function demoVariant(): Promise<DemoVariant> {
  if (process.env.NODE_ENV !== 'development') return 'demo';
  try {
    const { cookies } = await import('next/headers');
    const v = (await cookies()).get('stealz_demo')?.value;
    return v === 'worst' || v === 'empty' ? v : 'demo';
  } catch {
    return 'demo';
  }
}

// Store names as Google Shopping really shows them: long outlet names, marketplace sellers,
// and one very short one.
const STORE_NAMES: Record<CountryCode, Record<string, string>> = {
  US: {
    "Macy's": 'Saks Fifth Avenue OFF 5TH',
    Zappos: 'Neiman Marcus Last Call',
    'Amazon.com': 'Amazon.com - Seller: BigApple Luxury Wholesale',
    Shopbop: 'J',
    "Dillard's": "Bloomingdale's The Outlet Store",
  },
  GB: { ASOS: 'THE OUTNET.COM', Flannels: 'Flannels Outlet - Cheshire Oaks Designer Outlet', Schuh: 'END.' },
  AE: { noon: 'noon - Seller: Al Wasl Luxury Trading LLC', '6thStreet': '6thStreet.com Outlet', Ounass: 'O' },
  IN: { Flipkart: 'Flipkart - Seller: SuperComNet Retail Pvt Ltd', AJIO: 'AJIO LUXE', 'Shoppers Stop': 'S' },
};

/** Per product in catalog order: what goes wrong with it. Spread across rows, like real data. */
function productFix(index: number, item: ProviderItem): ProviderItem {
  switch (index) {
    case 0:
      return {
        ...item,
        title: `${item.title.replace(/ in .*/, '')} in Polished Pebble Leather with Signature Canvas Interior and Adjustable Crossbody Strap, ${item.title.split(' in ').pop()}, One Size`,
      };
    case 1:
      return { ...item, title: 'Tote', rating: undefined, reviews: undefined };
    case 2:
      return { ...item, title: 'CH-TABBY26-B4/CHALK-PEBBLE-LEATHER-SHOULDERBAG-AUTHENTIC', image: undefined, reviews: 1 };
    case 3:
      // A luxury price, so totals and their columns have to make room for many digits.
      return {
        ...item,
        price: Math.round(item.price * 41.3 * 100) / 100 + 0.67,
        originalPrice: item.originalPrice ? Math.round(item.originalPrice * 41.3) : undefined,
        image: 'https://example.com/images/missing-product-photo-404.jpg',
        reviews: 12847,
      };
    case 4:
      // No delivery estimate and no rating at all.
      return { ...item, notes: item.notes.filter((n) => !/deliver|get it|arrive/i.test(n)), rating: undefined, reviews: undefined };
    default:
      return item;
  }
}

function fixItems(items: ProviderItem[], country: CountryCode, productIndex: (item: ProviderItem) => number): ProviderItem[] {
  const names = STORE_NAMES[country];
  return items.map((item) => {
    const renamed = names[item.store] ? { ...item, store: names[item.store], storeLogo: undefined } : item;
    return productFix(productIndex(item), renamed);
  });
}

export function applySearchVariant(result: ProviderSearchResult, variant: DemoVariant, country: CountryCode): ProviderSearchResult {
  if (variant === 'demo') return result;
  if (variant === 'empty') return { ...result, items: [] };
  const order: string[] = [];
  for (const item of result.items) if (item.productId && !order.includes(item.productId)) order.push(item.productId);
  return { ...result, items: fixItems(result.items, country, (item) => order.indexOf(item.productId ?? '')) };
}

export function applyProductVariant(
  result: ProviderProductResult | null,
  variant: DemoVariant,
  ref: ProductRef,
  country: CountryCode,
): ProviderProductResult | null {
  if (variant === 'demo' || !result) return result;
  if (variant === 'empty') return { ...result, items: [] };
  const index = demoCatalog(ref.q, country).findIndex((p) => p.pid === ref.pid);
  const items = fixItems(result.items, country, () => index);
  const first = items[0];
  return {
    ...result,
    details: {
      ...result.details,
      title: first?.title ?? result.details.title,
      brand: index === 1 ? undefined : result.details.brand,
      images: index === 2 ? [] : result.details.images,
      rating: first?.rating,
      reviews: first?.reviews,
      description: index === 0 ? `${result.details.description ?? ''} ${'Made from polished pebble leather. '.repeat(14)}`.trim() : result.details.description,
    },
    items,
  };
}
