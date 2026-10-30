// Turns the free-text delivery, shipping and returns notes that stores and Google show
// ("Free delivery by Tue, Nov 4", "Get it today ($10)", "Free 30-day returns") into numbers.

import type { CountryCode, CurrencyCode, DeliveryEstimate, DeliverySpeed, ReturnsInfo, ShippingInfo } from './types';
import { COUNTRIES } from './countries';
import { MONTHS, WEEKDAYS, addBusinessDays, dayNumber, formatDay, formatRange, isoFromDay, todayIn, weekdayOf, yearOf } from './dates';
import { findMoneyInText, formatMoney, parseMoney } from './money';

export interface ParseContext {
  /** Today's date in the shopper's time zone, as a day number. */
  today: number;
  country: CountryCode;
  currency: CurrencyCode;
  locale: string;
  /** Item price, used to apply "free shipping over $X" rules. */
  price?: number;
}

export function makeContext(country: CountryCode, timeZone: string, price?: number, now: Date = new Date()): ParseContext {
  const cfg = COUNTRIES[country];
  return { today: todayIn(timeZone, now), country, currency: cfg.currency, locale: cfg.locale, price };
}

const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const WEEKDAY = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\\.?';
const DASH = '\\s*(?:-|–|—|to|and)\\s*';

const RE_MONTH_RANGE = new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?${DASH}(?:${MONTH}\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i');
const RE_DAY_FIRST_RANGE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+${MONTH})?${DASH}(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}`, 'i');
const RE_MONTH_DAY = new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i');
const RE_DAY_MONTH = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}(?![a-z])`, 'i');
const RE_WEEKDAY_RANGE = new RegExp(`\\b${WEEKDAY}${DASH}${WEEKDAY}(?![a-z])`, 'i');
const RE_WEEKDAY = new RegExp(`\\b${WEEKDAY}(?![a-z])`, 'i');
const RE_TODAY = /\b(today|same[- ]?day|tonight)\b/i;
const RE_TOMORROW = /\b(tomorrow|next[- ]?day|overnight)\b/i;
const RE_DAYS_RANGE = /\b(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*(business\s+|working\s+)?days?\b/i;
const RE_IN_DAYS = /\b(in|within)\s+(\d{1,2})\s*(business\s+|working\s+)?days?\b/i;
const RE_N_DAY = /\b(\d)[- ]day\b/i;

const DELIVERY_WORDS = /(deliver|shipping|ships|ship\b|get it|arriv|dispatch|delivery|courier)/i;
const PICKUP_WORDS = /(pick ?up|in store|in-store|nearby|curbside|\bmi\b|\bkm\b)/i;

function monthNumber(name: string): number {
  return MONTHS[name.toLowerCase().replace('.', '')] ?? 0;
}

function weekdayNumber(name: string): number {
  return WEEKDAYS[name.toLowerCase().replace('.', '')] ?? -1;
}

/** Picks the year that puts month/day nearest to today (handles Dec -> Jan). */
function resolveMonthDay(month: number, day: number, today: number): number | null {
  if (!month || day < 1 || day > 31) return null;
  const y = yearOf(today);
  let candidate = dayNumber(y, month, day);
  if (candidate < today - 60) candidate = dayNumber(y + 1, month, day);
  else if (candidate > today + 300) candidate = dayNumber(y - 1, month, day);
  return candidate;
}

/** Next occurrence of a weekday after today (a "by Mon" note on a Monday means next week). */
function nextWeekday(weekday: number, today: number, from = today): number {
  const current = weekdayOf(from);
  let delta = (weekday - current + 7) % 7;
  if (delta === 0 && from === today) delta = 7;
  return from + delta;
}

export function classifySpeed(maxDays: number | null): DeliverySpeed {
  if (maxDays == null) return 'unknown';
  if (maxDays <= 0) return 'today';
  if (maxDays === 1) return 'next-day';
  if (maxDays <= 3) return 'fast';
  if (maxDays <= 7) return 'standard';
  return 'slow';
}

export function unknownDelivery(raw?: string): DeliveryEstimate {
  return { minDays: null, maxDays: null, minDate: null, maxDate: null, label: 'Delivery date not listed', speed: 'unknown', raw };
}

export function estimateFromDays(minDay: number, maxDay: number, ctx: ParseContext, raw?: string): DeliveryEstimate {
  let lo = Math.min(minDay, maxDay);
  let hi = Math.max(minDay, maxDay);
  lo = Math.max(lo, ctx.today);
  hi = Math.max(hi, lo);
  const minDays = lo - ctx.today;
  const maxDays = hi - ctx.today;
  const minDate = isoFromDay(lo);
  const maxDate = isoFromDay(hi);
  let label: string;
  if (maxDays === 0) label = 'Arrives today';
  else if (minDays === 1 && maxDays === 1) label = 'Arrives tomorrow';
  else if (minDays === maxDays) label = `Arrives ${formatDay(minDate, ctx.locale)}`;
  else label = `Arrives ${formatRange(minDate, maxDate, ctx.locale)}`;
  return { minDays, maxDays, minDate, maxDate, label, speed: classifySpeed(maxDays), raw };
}

/** Parses an ISO timestamp (e.g. eBay's estimated delivery dates) into a local day number. */
export function dayFromTimestamp(value: string | undefined, timeZone: string): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return todayIn(timeZone, d);
}

/** Reads a delivery window out of one line of text, or returns null when there isn't one. */
export function parseDeliveryWindow(text: string, ctx: ParseContext): DeliveryEstimate | null {
  const t = text.replace(/ /g, ' ');
  const weekend = COUNTRIES[ctx.country].weekend;
  let m: RegExpMatchArray | null;

  if ((m = t.match(RE_MONTH_RANGE))) {
    const m1 = monthNumber(m[1]);
    const m2 = m[3] ? monthNumber(m[3]) : m1;
    const a = resolveMonthDay(m1, Number(m[2]), ctx.today);
    let b = resolveMonthDay(m2, Number(m[4]), ctx.today);
    if (a != null && b != null) {
      if (b < a) b = resolveMonthDay(m2, Number(m[4]), a + 1) ?? b;
      return estimateFromDays(a, b, ctx, text);
    }
  }
  if ((m = t.match(RE_DAY_FIRST_RANGE))) {
    const m2 = monthNumber(m[4]);
    const m1 = m[2] ? monthNumber(m[2]) : m2;
    const a = resolveMonthDay(m1, Number(m[1]), ctx.today);
    const b = resolveMonthDay(m2, Number(m[3]), ctx.today);
    if (a != null && b != null) return estimateFromDays(a, b, ctx, text);
  }
  if ((m = t.match(RE_MONTH_DAY))) {
    const d = resolveMonthDay(monthNumber(m[1]), Number(m[2]), ctx.today);
    if (d != null) return estimateFromDays(d, d, ctx, text);
  }
  if ((m = t.match(RE_DAY_MONTH))) {
    const d = resolveMonthDay(monthNumber(m[2]), Number(m[1]), ctx.today);
    if (d != null) return estimateFromDays(d, d, ctx, text);
  }
  if (RE_TODAY.test(t)) return estimateFromDays(ctx.today, ctx.today, ctx, text);
  if (RE_TOMORROW.test(t)) return estimateFromDays(ctx.today + 1, ctx.today + 1, ctx, text);
  if ((m = t.match(RE_WEEKDAY_RANGE))) {
    const w1 = weekdayNumber(m[1]);
    const w2 = weekdayNumber(m[2]);
    if (w1 >= 0 && w2 >= 0) {
      const a = nextWeekday(w1, ctx.today);
      const b = nextWeekday(w2, ctx.today, a);
      return estimateFromDays(a, b, ctx, text);
    }
  }
  if ((m = t.match(RE_WEEKDAY))) {
    const w = weekdayNumber(m[1]);
    if (w >= 0) {
      const d = nextWeekday(w, ctx.today);
      return estimateFromDays(d, d, ctx, text);
    }
  }
  if ((m = t.match(RE_DAYS_RANGE))) {
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    if (m[3]) {
      return estimateFromDays(addBusinessDays(ctx.today, lo, weekend), addBusinessDays(ctx.today, hi, weekend), ctx, text);
    }
    return estimateFromDays(ctx.today + lo, ctx.today + hi, ctx, text);
  }
  if ((m = t.match(RE_IN_DAYS))) {
    const n = Number(m[2]);
    const end = m[3] ? addBusinessDays(ctx.today, n, weekend) : ctx.today + n;
    const start = m[1].toLowerCase() === 'within' ? Math.min(ctx.today + 1, end) : end;
    return estimateFromDays(start, end, ctx, text);
  }
  if (!/return/i.test(t) && (m = t.match(RE_N_DAY))) {
    const n = Number(m[1]);
    return estimateFromDays(ctx.today + n, ctx.today + n, ctx, text);
  }
  return null;
}

function shippingLabel(ctx: ParseContext, cost: number | null, free: boolean, threshold?: number): string {
  const word = ctx.country === 'US' ? 'shipping' : 'delivery';
  if (free) return `Free ${word}`;
  if (cost != null) return `${formatMoney(cost, ctx.currency)} ${word}`;
  if (threshold != null) return `Free ${word} over ${formatMoney(threshold, ctx.currency)}`;
  return ctx.country === 'US' ? 'Shipping not listed' : 'Delivery fee not listed';
}

export function makeShipping(ctx: ParseContext, cost: number | null, free = false, threshold?: number): ShippingInfo {
  const isFree = free || cost === 0;
  return { cost: isFree ? 0 : cost, free: isFree, threshold, label: shippingLabel(ctx, isFree ? 0 : cost, isFree, threshold) };
}

/** Reads shipping cost out of one line of text, or returns null when it says nothing about cost. */
export function parseShippingText(text: string, ctx: ParseContext): ShippingInfo | null {
  const t = text.replace(/ /g, ' ');
  const lower = t.toLowerCase();

  // "Free delivery on $75+", "Free shipping on orders over $50", "Free delivery above ₹499", "Free delivery over £50"
  const threshold = lower.match(
    /free[^.]*?(?:deliver|ship)[^.]*?(?:\borders?\s+(?:of\s+|over\s+|above\s+)?|\b(?:over|above)\s+|\bon\s+(?=[$₹£]|aed|rs\b|rs\.|inr|gbp))(?:us\$|[$₹£]|aed\s?|rs\.?\s?|inr\s?|gbp\s?)?\s*(\d[\d,]*(?:\.\d+)?)/,
  );
  if (threshold) {
    const thr = parseMoney(threshold[1]);
    if (thr != null) {
      if (ctx.price != null && ctx.price >= thr) return makeShipping(ctx, 0, true, thr);
      return makeShipping(ctx, null, false, thr);
    }
  }
  // "Get it by Wed (Free)", "Get it today ($10)"
  const paren = t.match(/\(([^)]*)\)/);
  if (paren) {
    const inside = paren[1];
    if (/\bfree\b/i.test(inside)) return makeShipping(ctx, 0, true);
    const amount = findMoneyInText(inside) ?? (/^\s*\d[\d,]*(?:\.\d+)?\s*$/.test(inside) ? parseMoney(inside) : null);
    if (amount != null) return makeShipping(ctx, amount);
  }
  const freeNearShipping =
    /\bfree\s+(?:standard\s+|express\s+|next[- ]?day\s+|same[- ]?day\s+|\d[- ]day\s+|home\s+)?(?:deliver|ship)/.test(lower) ||
    /(?:deliver\w*|shipping)\s*(?:is\s+|:\s*|-\s*)?free\b/.test(lower);
  if (freeNearShipping) return makeShipping(ctx, 0, true);
  if (/(deliver|ship)/i.test(lower)) {
    const amount = findMoneyInText(t);
    if (amount != null) return makeShipping(ctx, amount);
  }
  return null;
}

/** Parses Google/SerpApi-style shipping fields such as "Free", "+ $4.00" or a number. */
export function parseShippingField(field: unknown, extracted: unknown, ctx: ParseContext): ShippingInfo | null {
  if (typeof extracted === 'number' && Number.isFinite(extracted)) return makeShipping(ctx, extracted);
  if (typeof field === 'string' && field.trim()) {
    if (/free/i.test(field)) return makeShipping(ctx, 0, true);
    const amount = parseMoney(field);
    if (amount != null) return makeShipping(ctx, amount);
  }
  return null;
}

export function parseReturns(texts: (string | null | undefined)[]): ReturnsInfo | undefined {
  for (const raw of texts) {
    if (!raw) continue;
    const t = raw.toLowerCase();
    if (/(not eligible for returns|no returns|non[- ]?returnable|final sale|returns not accepted|no return)/.test(t)) {
      return { label: 'No returns', none: true, days: 0 };
    }
    const m = t.match(/(free\s+)?(\d{1,3})[- ]day returns?/);
    if (m) {
      const days = Number(m[2]);
      const free = Boolean(m[1]);
      return { label: `${free ? 'Free ' : ''}${days}-day returns`, free, days };
    }
    if (/free returns?/.test(t)) return { label: 'Free returns', free: true };
    if (/(easy returns|returns accepted|returnable|exchange)/.test(t)) return { label: 'Returns accepted' };
  }
  return undefined;
}

export function parseStock(texts: (string | null | undefined)[]): boolean | undefined {
  for (const raw of texts) {
    if (!raw) continue;
    if (/(out of stock|sold out|unavailable|currently unavailable)/i.test(raw)) return false;
    if (/\bin stock\b/i.test(raw)) return true;
  }
  return undefined;
}

export interface InterpretedDetails {
  delivery: DeliveryEstimate;
  shipping: ShippingInfo | null;
  returns?: ReturnsInfo;
  inStock?: boolean;
}

/**
 * Interprets a list of short notes about an offer ("In stock online", "Free delivery by Tue",
 * "Free 30-day returns") into delivery, shipping, returns and stock information.
 */
export function interpretDetails(texts: (string | null | undefined)[], ctx: ParseContext): InterpretedDetails {
  const lines = texts.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  let delivery: DeliveryEstimate | null = null;
  let shipping: ShippingInfo | null = null;
  for (const line of lines) {
    if (PICKUP_WORDS.test(line) && !DELIVERY_WORDS.test(line)) continue;
    const isDeliveryLine = DELIVERY_WORDS.test(line) && !/^\s*(free\s+)?\d{1,3}[- ]day returns?\s*$/i.test(line);
    if (!isDeliveryLine) continue;
    if (!delivery) delivery = parseDeliveryWindow(line, ctx);
    if (!shipping) shipping = parseShippingText(line, ctx);
  }
  const deliveryLine = lines.find((l) => DELIVERY_WORDS.test(l));
  return {
    delivery: delivery ?? unknownDelivery(deliveryLine),
    shipping,
    returns: parseReturns(lines),
    inStock: parseStock(lines),
  };
}
