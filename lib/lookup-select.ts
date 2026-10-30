// For the Chrome extension: turn the product a shopper is looking at into a search, then sort
// the results into "the same item at other stores" and "the same item in other colors".
// Pure logic, easy to test; the types are shared with the extension's API response.

import type { CurrencyCode, Listing } from './types';
import { colorMismatch, colorsIn } from './colors';
import { discountPercent } from './offer';
import { cheapestOf, effectiveTotal } from './scoring';
import { CLOSE_MATCH, normalize } from './text';

export interface LookupOffer {
  store: string;
  title: string;
  image?: string;
  price: number;
  total: number;
  /** False when the store didn't list shipping, so the total may be higher. */
  totalIsComplete: boolean;
  shipping: string;
  delivery: string;
  link?: string;
  /** Encoded product reference for the comparison page on Stealz. */
  ref: string;
  /** The color the listing names, when it names one. */
  color?: string;
  /** This listing is from the store the shopper is on. */
  thisStore?: boolean;
  /** Short labels: "25% off", "Marketplace seller". */
  tags: string[];
}

export interface LookupColor {
  color: string;
  /** Color family ("green" for "Sage"), for drawing a swatch. */
  family: string;
  /** Lowest total for this color. */
  from: number;
  offers: LookupOffer[];
}

export interface LookupPick {
  sameItem: LookupOffer[];
  otherColors: LookupColor[];
  cheapest?: LookupOffer;
  /** This store's offer, when it shows up in the results. */
  here?: LookupOffer;
  /** How much less the cheapest is: total vs this store's total, or item price vs this page's price. */
  savings?: { amount: number; basis: 'total' | 'price' };
  bestRef?: string;
}

export interface LookupResponse extends LookupPick {
  query: string;
  /** The color of the item on the page, when it says. */
  pageColor?: string;
  pagePrice?: number;
  currency: CurrencyCode;
  locationLabel: string;
  compareUrl: string;
  productUrl?: string;
  fetchedAt: string;
  demo: boolean;
  notices: string[];
}

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** True when a piece of a title is nothing but colors: "White/Black", "Sage Green". */
function onlyColors(text: string): boolean {
  let rest = ` ${normalize(text)} `;
  for (const h of colorsIn(text)) rest = rest.split(` ${h.word} `).join(' ');
  return rest.replace(/\b(?:and|with|colou?r)\b/g, ' ').trim() === '';
}

/**
 * A store search from a product page's title: no store name, sizes or colors (so every color
 * comes back), the brand first, at most eight words. The color it removes is returned too.
 */
export function lookupQuery(title: string, brand?: string): { query: string; color?: string } {
  let t = title.replace(/[®™]/g, '').replace(/\s+/g, ' ').trim();
  const parts = t.split(/\s+[|–—]\s+|\s+-\s+|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) t = parts[0].split(' ').length >= 3 || parts[0].length >= parts[1].length ? parts[0] : parts[1];
  // A suffix made only of colors ("– White/Black") still says the color; a store name never does.
  const suffix = parts.find((x) => x !== t && colorsIn(x).length > 0 && onlyColors(x));
  t = t
    .replace(/^buy\s+/i, '')
    .replace(/\s+online\b.*$/i, '')
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\b(?:size|sz)\s*[:\-]?\s*[\w./]+/gi, ' ');
  // Colors are read before the part after a comma is dropped: "Wax Jacket, Olive".
  const flat = ` ${normalize(t)} `;
  const hits = colorsIn(t).sort((x, y) => flat.indexOf(` ${x.word} `) - flat.indexOf(` ${y.word} `));
  if (hits.length === 0 && suffix) {
    const flatSuffix = ` ${normalize(suffix)} `;
    hits.push(...colorsIn(suffix).sort((x, y) => flatSuffix.indexOf(` ${x.word} `) - flatSuffix.indexOf(` ${y.word} `)));
  }
  t = t.replace(/,.*$/, '');
  let color: string | undefined;
  if (hits.length > 0) {
    color = capital(hits[0].word);
    for (const h of hits) t = t.replace(new RegExp(`\\b${h.word.replace(/\s+/g, '[\\s-]+')}\\b`, 'gi'), ' ');
    t = t.replace(/\b(?:colou?r|in)\s*$/i, ' ');
  }
  let words = t.replace(/[^\p{L}\p{N}'&.\s-]/gu, ' ').split(/\s+/).filter(Boolean);
  const b = brand?.trim();
  if (b && !normalize(words.join(' ')).includes(normalize(b))) words = [...b.split(/\s+/), ...words];
  words = words.slice(0, 8);
  return { query: words.join(' ').trim() || title.slice(0, 80), color };
}

/** The part of a web address that names the store: "www.nordstrom.com" -> "nordstrom". */
export function storeStem(host?: string): string | undefined {
  if (!host) return undefined;
  const parts = host.toLowerCase().replace(/^(?:www\d?|m|shop|store|en|us|uk)\./, '').split('.');
  if (parts.length < 2) return parts[0] || undefined;
  // "amazon.co.uk" -> "amazon"; "nordstrom.com" -> "nordstrom".
  const second = parts[parts.length - 2];
  const stem = ['co', 'com', 'net', 'org'].includes(second) && parts.length >= 3 ? parts[parts.length - 3] : second;
  return stem.length >= 3 ? stem : undefined;
}

function isThisStore(l: Listing, stem?: string): boolean {
  if (!stem) return false;
  const store = normalize(l.store).replace(/\s+/g, '');
  const domain = l.storeDomain ? storeStem(l.storeDomain) : undefined;
  return domain === stem || store.includes(stem) || (store.length >= 4 && stem.includes(store));
}

function toOffer(l: Listing, stem?: string): LookupOffer {
  const tags: string[] = [];
  const pct = l.discountNote ? null : (discountPercent(l.price, l.originalPrice) ?? l.discountPct ?? null);
  if (pct != null) tags.push(`${pct}% off`);
  if (l.isMarketplace) tags.push('Marketplace seller');
  const color = colorsIn(l.title)[0];
  return {
    store: l.store,
    title: l.title,
    image: l.image,
    price: l.price,
    total: l.total,
    totalIsComplete: l.totalIsComplete,
    shipping: l.shipping.label,
    delivery: l.delivery.label,
    link: l.link,
    ref: l.ref,
    color: color ? capital(color.word) : undefined,
    thisStore: isThisStore(l, stem) || undefined,
    tags,
  };
}

/** One key per store, so "coach.com" and "COACH" (or "Amazon.co.uk" and "Amazon") count once. */
export function storeKey(store: string): string {
  return normalize(store).replace(/\s+(?:com|co|uk|net|org|ae|in|us)\b/g, '').replace(/\s+/g, '');
}

/** The cheapest listing per store, cheapest first. */
function perStore(listings: Listing[]): Listing[] {
  const best = new Map<string, Listing>();
  for (const l of listings) {
    const key = storeKey(l.store);
    const prev = best.get(key);
    if (!prev || effectiveTotal(l) < effectiveTotal(prev)) best.set(key, l);
  }
  return [...best.values()].sort((a, b) => effectiveTotal(a) - effectiveTotal(b));
}

/**
 * Close matches split by color. With the page's color known, listings that name another color
 * go to `otherColors`; without it, every close match counts as the same item and `otherColors`
 * lists the colors stores name.
 */
export function pickOffers(
  listings: Listing[],
  opts: { pageColor?: string; host?: string; pagePrice?: number; pageCurrency?: string; currency: CurrencyCode },
): LookupPick {
  const stem = storeStem(opts.host);
  const close = listings.filter((l) => l.match >= CLOSE_MATCH);
  const same: Listing[] = [];
  const other = new Map<string, { label: string; items: Listing[] }>();
  for (const l of close) {
    const differs = opts.pageColor ? colorMismatch(opts.pageColor, l.title) != null : false;
    const hit = colorsIn(l.title)[0];
    if (differs || (!opts.pageColor && hit)) {
      if (hit) {
        const group = other.get(hit.family) ?? { label: capital(hit.word), items: [] as Listing[] };
        group.items.push(l);
        other.set(hit.family, group);
      }
      if (differs) continue;
    }
    same.push(l);
  }

  const sameItem = perStore(same).slice(0, 10).map((l) => toOffer(l, stem));
  const cheapestListing = cheapestOf(perStore(same));
  const cheapest = cheapestListing ? toOffer(cheapestListing, stem) : undefined;
  const here = sameItem.find((o) => o.thisStore);

  let savings: LookupPick['savings'];
  if (cheapest && here && !cheapest.thisStore && here.total - cheapest.total >= 1) {
    savings = { amount: Math.round((here.total - cheapest.total) * 100) / 100, basis: 'total' };
  } else if (cheapest && !here && opts.pagePrice && opts.pageCurrency === opts.currency && opts.pagePrice - cheapest.price >= 1) {
    savings = { amount: Math.round((opts.pagePrice - cheapest.price) * 100) / 100, basis: 'price' };
  }

  const pageFamily = opts.pageColor ? colorsIn(opts.pageColor)[0]?.family : undefined;
  const otherColors: LookupColor[] = [...other.entries()]
    .filter(([family]) => family !== pageFamily)
    .map(([family, g]) => {
      const offers = perStore(g.items).slice(0, 3).map((l) => toOffer(l, stem));
      return { color: g.label, family, from: offers[0]?.total ?? 0, offers };
    })
    .filter((c) => c.offers.length > 0)
    .sort((a, b) => a.from - b.from)
    .slice(0, 6);

  return { sameItem, otherColors, cheapest, here, savings, bestRef: cheapestListing?.ref };
}
