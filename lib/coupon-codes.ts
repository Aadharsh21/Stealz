// Finds promo codes in what stores publish on Google Shopping: the coupon field in a product's
// store list, and notes like "Get 20% off with code SAVE20". Pure logic, easy to test, and the
// types are shared with the browser.

import type { ProviderItem } from './providers/types';
import type { StoreSale } from './sale-tabs';

export interface FoundCoupon {
  store: string;
  code: string;
  /** The store's own words about the code, when it gave any. */
  detail?: string;
  link?: string;
  title: string;
}

/** A code as the coupons page shows it. */
export interface CouponRow {
  store: string;
  code: string;
  detail?: string;
  link?: string;
  productTitle?: string;
  /** Encoded product reference, when the code was seen on a product's comparison page. */
  productRef?: string;
  seenCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface CouponsResponse {
  codes: CouponRow[];
  stores: StoreSale[];
  /** When the newest sale data used for `stores` was checked. */
  salesCheckedAt: string | null;
}

/** Codes are written in capitals: "SAVE20", "WELCOME-10". Lowercase words are never codes. */
const CODE = /^[A-Z0-9][A-Z0-9_-]{2,23}$/;
const NOT_CODES = new Set([
  'APPLIED', 'REQUIRED', 'NEEDED', 'CHECKOUT', 'ONLINE', 'TODAY', 'DISCOUNT', 'CODE', 'CODES', 'PROMO', 'COUPON',
  'VOUCHER', 'FREE', 'SALE', 'ONLY', 'AND', 'THE', 'FOR', 'WITH', 'EXTRA', 'HERE', 'NOW', 'OFF', 'APP', 'USE', 'GET',
  'SAVE', 'NEW', 'ALL', 'ANY', 'BELOW', 'ABOVE', 'DETAILS', 'TERMS',
]);
const AFTER_KEYWORD =
  /\b(?:(?:promo|promotional|discount|coupon|voucher|offer)\s+)?(?:code|coupon|voucher)\b\s*[:\-–]?\s*["“'‘]?([A-Za-z0-9][A-Za-z0-9_-]{2,23})/gi;

function isCode(token: string): boolean {
  return CODE.test(token) && /[A-Z]/.test(token) && !NOT_CODES.has(token);
}

/** Every promo code written after "code", "coupon" or "voucher" in a piece of text. */
export function codesInText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(AFTER_KEYWORD)) {
    const token = m[1].replace(/[-_]+$/, '');
    if (isCode(token) && !out.includes(token)) out.push(token);
  }
  return out;
}

/** Promo codes in a set of store listings, one per store and code. */
export function couponsFromItems(items: ProviderItem[]): FoundCoupon[] {
  const found = new Map<string, FoundCoupon>();
  const add = (item: ProviderItem, code: string, detail?: string) => {
    const key = `${item.store.toLowerCase()}|${code}`;
    if (!found.has(key)) {
      found.set(key, { store: item.store, code, detail: detail?.trim().slice(0, 160), link: item.link, title: item.title });
    }
  };
  for (const item of items) {
    const raw = item.coupon?.trim();
    if (raw) {
      const whole = raw.replace(/^["“'‘]+|["”'’]+$/g, '').toUpperCase();
      if (isCode(whole)) add(item, whole);
      else for (const code of codesInText(raw)) add(item, code, raw);
    }
    for (const note of item.notes) {
      for (const code of codesInText(note)) add(item, code, note);
    }
  }
  return [...found.values()];
}
