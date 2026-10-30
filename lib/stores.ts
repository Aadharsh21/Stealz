// What we know about stores: resale shops (excluded because we only show new items),
// marketplaces (third-party sellers, flagged so shoppers can judge authenticity) and
// brand-owned stores.

import type { CountryCode } from './types';
import { normalize } from './text';

const squash = (s: string) => normalize(s).replace(/\s+/g, '');

/** Stores that sell pre-owned or consigned items. Listings from them are hidden. */
const RESALE_STORES = [
  'therealreal', 'fashionphile', 'rebag', 'vestiaire', 'vestiairecollective', 'poshmark', 'thredup',
  'mercari', 'depop', 'grailed', 'tradesy', 'whatgoesaroundcomesaround', 'whatgoesaroundnyc',
  'luxurygaragesale', 'yoogiscloset', 'theluxurycloset', 'luxurycloset', 'reemscloset', 'luxepolis',
  'confidentialcouture', 'bagborroworsteal', 'annsfabulousfinds', 'labellov', 'collectorsquare',
  'designerexchange', 'cudoni', 'hardlyeverwornit', 'rebelle', 'vinted', 'shopgoodwill', 'swapcom',
  'secondhandcorner', 'luxuryexchange', 'thrift', 'consign', 'preloved', 'preowned', 'resale',
];

/** Places where independent sellers list items (authenticity varies). */
const MARKETPLACE_PATTERNS = [
  /\bebay\b/, /\s-\s?seller\b/, /\bmarketplace\b/, /\betsy\b/, /\bmeesho\b/, /\bsnapdeal\b/,
  /\baliexpress\b/, /\bdhgate\b/, /\btemu\b/, /\bwish\b/, /\bshein marketplace\b/, /\bwalmart seller\b/,
  /\bamazon\b.*\bseller\b/, /\bnoon\b.*\bseller\b/, /\bshop app\b/,
];

/** Sellers known for very cheap unbranded copies; listed so shoppers see a warning. */
const LOW_TRUST_PATTERNS = [/\baliexpress\b/, /\bdhgate\b/, /\btemu\b/, /\bwish\b/, /\bshein\b/];

const USED_TITLE =
  /\b(pre[- ]?owned|preowned|pre[- ]?loved|preloved|second[- ]?hand|refurbished|renewed|restored|re-?loved|loved|used|gently worn|worn once|consigned|ex[- ]display)\b/i;

/**
 * Stores we recognize. Deep discounts from these are usually real, so they get more leeway
 * before a price is called suspicious.
 */
const KNOWN_RETAILERS = [
  // US department stores, off-price and marketplaces
  'nordstrom', 'macys', 'bloomingdales', 'saks', 'neimanmarcus', 'bergdorfgoodman', 'dillards', 'vonmaur',
  'belk', 'kohls', 'jcpenney', 'zappos', '6pm', 'amazon', 'walmart', 'target', 'costco', 'tjmaxx',
  'marshalls', 'burlington', 'dsw', 'footlocker', 'finishline', 'jdsports', 'champssports', 'dickssportinggoods',
  'rei', 'shopbop', 'revolve', 'fwrd', 'ssense', 'farfetch', 'mytheresa', 'netaporter', 'mrporter', '24s',
  'luisaviaroma', 'modaoperandi', 'cettire', 'italist', 'editorialist', 'ebay', 'etsy',
  'asos', 'zara', 'hm', 'uniqlo', 'mango', 'gap', 'oldnavy', 'bananarepublic', 'jcrew', 'madewell', 'abercrombie',
  'americaneagle', 'urbanoutfitters', 'anthropologie', 'freepeople', 'lululemon', 'sunglasshut', 'lenscrafters',
  // Brands selling direct
  'coach', 'katespade', 'michaelkors', 'toryburch', 'furla', 'longchamp', 'guess', 'calvinklein', 'tommyhilfiger',
  'ralphlauren', 'levi', 'nike', 'adidas', 'newbalance', 'puma', 'converse', 'vans', 'reebok', 'asics', 'hoka',
  'thenorthface', 'patagonia', 'columbia', 'canadagoose', 'moncler', 'ugg', 'drmartens', 'timberland', 'birkenstock',
  'crocs', 'skechers', 'clarks', 'stevemadden', 'samedelman', 'charleskeith', 'charlesandkeith', 'rayban', 'oakley',
  'fossil', 'swarovski', 'pandora', 'tiffany', 'gucci', 'prada', 'louisvuitton', 'dior', 'burberry', 'balenciaga',
  'saintlaurent', 'ysl', 'bottegaveneta', 'fendi', 'givenchy', 'valentino', 'versace', 'mcm', 'marcjacobs',
  // UAE
  'namshi', 'noon', 'ounass', '6thstreet', 'levelshoes', 'harveynichols', 'centrepoint', 'maxfashion', 'splash',
  'brandsforless', 'tryano', 'thatconceptstore', 'sharafdg', 'carrefour', 'luluhypermarket',
  // India
  'myntra', 'ajio', 'tatacliq', 'nykaa', 'flipkart', 'shoppersstop', 'lifestylestores', 'westside', 'pantaloons',
  'reliancetrends', 'bewakoof', 'thesouledstore', 'souledstore', 'fabindia', 'libas', 'biba', 'bata', 'metroshoes',
  'hidesign', 'caprese', 'lavie', 'baggit', 'titan', 'fastrack', 'tanishq', 'caratlane', 'lenskart', 'croma',
];

/** Website names that clearly aren't shops, typical of hijacked domains reused by fake stores. */
const NON_RETAIL =
  /(foundation|consult|surgi|clinic|dental|pharma|creche|church|ministr|charity|institute|association|council|attorney|realty|insurance|plumb|roofing|construct|logistic|accounting)/;

/** Country domains a shopper in each country commonly buys from. */
const OK_COUNTRY_DOMAINS = ['uk', 'us', 'ca', 'au', 'io', 'co'];

export function isResaleStore(store: string, domain?: string): boolean {
  const s = squash(store);
  const d = domain ? squash(domain) : '';
  return RESALE_STORES.some((r) => s.includes(r) || (d && d.includes(r)));
}

export function isMarketplace(store: string, domain?: string): boolean {
  const s = ` ${normalize(store)} `;
  const d = domain ? ` ${normalize(domain)} ` : '';
  return MARKETPLACE_PATTERNS.some((re) => re.test(s) || (d ? re.test(d) : false));
}

export function isLowTrustStore(store: string, domain?: string): boolean {
  const s = ` ${normalize(store)} `;
  const d = domain ? ` ${normalize(domain)} ` : '';
  return LOW_TRUST_PATTERNS.some((re) => re.test(s) || (d ? re.test(d) : false));
}

export function isKnownRetailer(store: string, domain?: string): boolean {
  const names = [squash(store), domain ? squash(domain.replace(/^www\./, '').split('.')[0] ?? '') : ''].filter(Boolean);
  return names.some((n) => KNOWN_RETAILERS.some((k) => n === k || (k.length >= 4 && n.startsWith(k))));
}

/**
 * True when a store looks like a fake shop: a non-retail website name (charities, clinics,
 * consultancies), a .org address, or a foreign country domain the shopper wouldn't expect.
 */
export function isSuspiciousStore(store: string, domain: string | undefined, country: CountryCode): boolean {
  if (isKnownRetailer(store, domain)) return false;
  for (const raw of [store, domain]) {
    if (!raw) continue;
    const name = raw.toLowerCase().trim();
    if (NON_RETAIL.test(name.replace(/[^a-z]/g, ''))) return true;
    const tld = name.match(/\.([a-z]{2,})$/)?.[1];
    if (!tld) continue;
    if (['org', 'edu', 'gov', 'ngo'].includes(tld)) return true;
    if (tld.length === 2 && tld !== country.toLowerCase() && !OK_COUNTRY_DOMAINS.includes(tld)) return true;
  }
  return false;
}

/** True when a title or condition field says the item isn't new. */
export function looksUsed(title: string, condition?: string | null): boolean {
  if (condition && !/^\s*new\b/i.test(condition)) return true;
  return USED_TITLE.test(title);
}

/** True when the store is the brand's own shop (e.g. Coach selling Coach). */
export function isBrandStore(store: string, brand?: string, domain?: string): boolean {
  if (!brand) return false;
  const b = squash(brand);
  if (b.length < 3) return false;
  const s = squash(store);
  if (s === b || s.startsWith(b)) return true;
  if (domain) {
    const host = squash(domain.replace(/^www\./, '').split('.')[0] ?? '');
    if (host === b || host.startsWith(b)) return true;
  }
  return false;
}

export function domainOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (host.endsWith('google.com') || host.endsWith('serpapi.com')) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

export function faviconFor(domain?: string): string | undefined {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : undefined;
}

/** "Amazon.com - Seller" -> "Amazon.com (seller)", trims long store names. */
export function cleanStoreName(store: string): string {
  const s = store.replace(/\s+/g, ' ').trim();
  if (/^shop\s*-\s*shop app$/i.test(s)) return 'Shop app';
  const seller = s.match(/^(.*?)\s*-\s*Seller$/i);
  if (seller) return `${seller[1]} (seller)`;
  return s.length > 40 ? `${s.slice(0, 39)}…` : s;
}
