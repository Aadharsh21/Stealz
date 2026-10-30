import type { CurrencyCode } from './types';

const LOCALES: Record<CurrencyCode, string> = { USD: 'en-US', GBP: 'en-GB', AED: 'en-AE', INR: 'en-IN' };

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Parses prices like "$1,299.99", "₹1,23,456", "AED 1,250.00", "+ $4.00", "1299".
 * Commas are always thousands separators for the countries we support.
 * Returns null for text without a number (e.g. "Free").
 */
export function parseMoney(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const match = input.replace(/ /g, ' ').match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

/** Finds the first amount written with a currency marker, e.g. "$4.99 delivery", "£3.95" or "AED 10". */
export function findMoneyInText(text: string): number | null {
  const t = text.replace(/ /g, ' ');
  const before = t.match(/(?:US\$|\$|£|₹|rs\.?\s?|inr\s?|aed\s?|usd\s?|gbp\s?|د\.إ\s?)\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (before) return parseMoney(before[1]);
  const after = t.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*(?:aed|inr|usd|gbp|dirhams?|rupees?)\b/i);
  if (after) return parseMoney(after[1]);
  return null;
}

export function formatMoney(amount: number, currency: CurrencyCode, opts: { compact?: boolean } = {}): string {
  const hasCents = Math.abs(amount - Math.round(amount)) >= 0.005;
  const decimals = currency === 'INR' ? (hasCents && amount < 1000 ? 2 : 0) : hasCents ? 2 : 0;
  try {
    return new Intl.NumberFormat(LOCALES[currency], {
      style: 'currency',
      currency,
      currencyDisplay: currency === 'AED' ? 'code' : 'narrowSymbol',
      minimumFractionDigits: opts.compact ? 0 : decimals,
      maximumFractionDigits: opts.compact ? 0 : decimals,
    }).format(opts.compact ? Math.round(amount) : amount);
  } catch {
    return `${currency} ${amount.toFixed(decimals)}`;
  }
}

export function currencySymbol(currency: CurrencyCode): string {
  return currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : 'AED';
}
