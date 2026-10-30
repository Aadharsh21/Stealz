// Sales tax estimates. US prices online are shown before tax, so we estimate it from the
// shopper's state. UAE (5% VAT) and India (GST) prices already include tax.
//
// Rates: Tax Foundation, "State and Local Sales Tax Rates, Midyear 2026" (combined state rate
// plus population-weighted average local rate, as of July 1, 2026). Local rates vary by city,
// so these are estimates. Google's own tax estimate is preferred whenever it's available.

import type { CountryCode, TaxInfo } from './types';
import { US_STATES } from './countries';
import { round2 } from './money';

/** Combined state + average local sales tax rate, in percent. */
export const US_COMBINED_RATES: Record<string, number> = {
  AL: 9.46, AK: 1.82, AZ: 8.54, AR: 9.48, CA: 9.03, CO: 7.89, CT: 6.35, DE: 0, DC: 6.0, FL: 6.98,
  GA: 7.56, HI: 4.5, ID: 6.03, IL: 8.98, IN: 7.0, IA: 6.94, KS: 8.71, KY: 6.0, LA: 10.13, ME: 5.5,
  MD: 6.0, MA: 6.25, MI: 6.0, MN: 8.14, MS: 7.06, MO: 8.44, MT: 0, NE: 6.98, NV: 8.24, NH: 0,
  NJ: 6.6, NM: 7.68, NY: 8.54, NC: 7.1, ND: 7.09, OH: 7.29, OK: 9.06, OR: 0, PA: 6.34, RI: 7.0,
  SC: 7.49, SD: 6.11, TN: 9.61, TX: 8.2, UT: 7.42, VT: 6.43, VA: 5.77, WA: 9.57, WV: 6.6, WI: 5.72,
  WY: 5.39,
};

/** Average local rate in New York (used for clothing under $110 outside New York City). */
const NY_AVERAGE_LOCAL_RATE = 4.54;
export const US_RATES_AS_OF = 'July 1, 2026';

export type ItemKind = 'clothing' | 'accessory';

const ACCESSORY_WORDS =
  /\b(bags?|handbags?|purses?|totes?|clutch(es)?|crossbody|satchels?|hobo|backpacks?|wallets?|card ?(case|holder)s?|cardholders?|wristlets?|pouch(es)?|briefcases?|luggage|suitcases?|duffel|duffle|jewel(le)?ry|necklaces?|bracelets?|earrings?|rings?|pendants?|charms?|anklets?|brooch(es)?|watch(es)?|smartwatch(es)?|sunglasses|eyewear|shades|umbrellas?|key ?chains?|key ?rings?|perfumes?|fragrances?|cologne|eau de (parfum|toilette))\b/i;

/** Rough tax category for a fashion item, following the common "clothing vs accessories" split. */
export function classifyItem(title: string): ItemKind {
  return ACCESSORY_WORDS.test(title) ? 'accessory' : 'clothing';
}

function isNewYorkCity(zip?: string): boolean {
  if (!zip || !/^\d{5}$/.test(zip)) return false;
  const p = Number(zip.slice(0, 3));
  return (p >= 100 && p <= 104) || p === 110 || p === 111 || p === 112 || p === 113 || p === 114 || p === 116;
}

function stateName(code: string): string {
  return US_STATES[code] ?? code;
}

/** Estimated US sales tax on an item's price for the shopper's state. */
export function estimateUsTax(price: number, title: string, regionCode?: string, postalCode?: string): TaxInfo {
  const code = regionCode?.toUpperCase();
  if (!code || US_COMBINED_RATES[code] === undefined) {
    return { amount: null, mode: 'unknown', note: 'Plus sales tax' };
  }
  const name = stateName(code);
  const rate = US_COMBINED_RATES[code];
  if (rate === 0 && code !== 'AK') {
    return { amount: 0, mode: 'none', rate: 0, note: `No sales tax in ${name}` };
  }
  const kind = classifyItem(title);
  const est = (pct: number, base = price) => round2((base * pct) / 100);

  if (kind === 'clothing') {
    if (code === 'PA' || code === 'NJ' || code === 'MN' || code === 'VT') {
      return { amount: 0, mode: 'none', rate: 0, note: `Clothing is tax-exempt in ${name}` };
    }
    if (code === 'NY' && price < 110) {
      if (isNewYorkCity(postalCode)) {
        return { amount: 0, mode: 'none', rate: 0, note: 'Clothing under $110 is tax-exempt in NYC' };
      }
      return {
        amount: est(NY_AVERAGE_LOCAL_RATE),
        mode: 'estimated',
        rate: NY_AVERAGE_LOCAL_RATE,
        note: 'Under $110: no NY state tax, local tax may apply',
      };
    }
    if (code === 'MA') {
      const taxable = Math.max(0, price - 175);
      return taxable === 0
        ? { amount: 0, mode: 'none', rate: 0, note: 'Clothing up to $175 is tax-exempt in MA' }
        : { amount: est(rate, taxable), mode: 'estimated', rate, note: 'MA taxes only the amount over $175' };
    }
    if (code === 'RI') {
      const taxable = Math.max(0, price - 250);
      return taxable === 0
        ? { amount: 0, mode: 'none', rate: 0, note: 'Clothing up to $250 is tax-exempt in RI' }
        : { amount: est(rate, taxable), mode: 'estimated', rate, note: 'RI taxes only the amount over $250' };
    }
  }
  return { amount: est(rate), mode: 'estimated', rate, note: `Est. ${rate}% ${code} sales tax` };
}

/** Tax for any supported country. */
export function taxFor(country: CountryCode, price: number, title: string, regionCode?: string, postalCode?: string): TaxInfo {
  if (country === 'AE') return { amount: 0, mode: 'included', rate: 5, note: 'Incl. 5% VAT' };
  if (country === 'IN') return { amount: 0, mode: 'included', note: 'Incl. GST' };
  return estimateUsTax(price, title, regionCode, postalCode);
}

/** Tax reported by Google for a specific store and location. */
export function exactTax(amount: number): TaxInfo {
  return { amount: round2(amount), mode: 'exact', note: 'Tax estimate from the store listing' };
}
