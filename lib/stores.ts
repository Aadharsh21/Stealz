// What we know about stores: resale shops (excluded because we only show new items),
// marketplaces (third-party sellers, flagged so shoppers can judge authenticity) and
// brand-owned stores.

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
  /\bamazon\b.*\bseller\b/, /\bnoon\b.*\bseller\b/,
];

/** Sellers known for very cheap unbranded copies; listed so shoppers see a warning. */
const LOW_TRUST_PATTERNS = [/\baliexpress\b/, /\bdhgate\b/, /\btemu\b/, /\bwish\b/, /\bshein\b/];

const USED_TITLE =
  /\b(pre[- ]?owned|preowned|pre[- ]?loved|preloved|second[- ]?hand|refurbished|renewed|used|gently worn|worn once|consigned|ex[- ]display)\b/i;

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
  const seller = s.match(/^(.*?)\s*-\s*Seller$/i);
  if (seller) return `${seller[1]} (seller)`;
  return s.length > 40 ? `${s.slice(0, 39)}…` : s;
}
