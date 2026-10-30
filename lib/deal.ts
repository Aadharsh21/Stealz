// Deal Score (0-100), fake-discount detection and price-history summaries.

import type { DealScore, HistoryPoint, HistoryResponse, Offer } from './types';
import { formatMoney, round2 } from './money';
import { cheapestOf, effectiveTotal } from './scoring';
import { colorMismatch } from './colors';
import { luxuryFloorWarning } from './luxury';
import { isKnownRetailer } from './stores';

export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Summarizes daily lowest prices into stats for the history chart. */
export function summarizeHistory(points: HistoryPoint[], current?: number, synthetic = false): HistoryResponse {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { points: [], current, synthetic };
  let lowest = sorted[0];
  let highest = sorted[0];
  let sum = 0;
  for (const p of sorted) {
    if (p.low < lowest.low) lowest = p;
    if (p.low > highest.low) highest = p;
    sum += p.low;
  }
  return {
    points: sorted,
    lowest: { total: lowest.low, date: lowest.date, store: lowest.store },
    highest: { total: highest.low, date: highest.date, store: highest.store },
    average: round2(sum / sorted.length),
    current: current ?? sorted[sorted.length - 1].low,
    since: sorted[0].date,
    synthetic,
  };
}

/** True when there is enough history to judge a price (5+ days spanning a week or more). */
export function historyIsUsable(h: HistoryResponse | null | undefined): h is HistoryResponse {
  if (!h || h.points.length < 5 || !h.since) return false;
  const first = Date.parse(h.points[0].date);
  const last = Date.parse(h.points[h.points.length - 1].date);
  return last - first >= 6 * 86_400_000;
}

/**
 * Flags "was" prices that look inflated: the store claims a big discount, but other stores
 * (or our tracked history) show the item normally sells near the "sale" price.
 * Returns offer id -> note.
 */
export function findInflatedDiscounts(offers: Offer[], history?: HistoryResponse | null): Map<string, string> {
  const notes = new Map<string, string>();
  for (const offer of offers) {
    if (!offer.originalPrice || offer.originalPrice <= offer.price) continue;
    const others = offers.filter((o) => o.id !== offer.id).map((o) => o.price);
    let reference: number | null = null;
    let basis = '';
    if (others.length >= 2) {
      reference = median(others);
      basis = 'Other stores sell it for about';
    } else if (historyIsUsable(history) && history.average) {
      reference = history.average;
      basis = 'It has usually sold for about';
    }
    if (reference == null || reference <= 0) continue;
    if (offer.originalPrice >= reference * 1.25 && offer.price >= reference * 0.9) {
      const money = (n: number) => formatMoney(n, offer.currency);
      notes.set(
        offer.id,
        `${basis} ${money(reference)}, so the "was ${money(offer.originalPrice)}" price looks inflated.`,
      );
    }
  }
  return notes;
}

/**
 * Flags offers priced far below what the same item usually costs. These are often fakes, used
 * items listed as new, or a different product, so they shouldn't win "lowest total". Stores we
 * recognize get more leeway; unverified sellers get less. Needs at least 4 prices to judge.
 */
export function markPriceOutliers<T extends Offer>(offers: T[], reference: Offer[] = offers): T[] {
  const prices = reference.map((o) => o.price).filter((p) => p > 0);
  if (prices.length < 4) return offers;
  const typical = median(prices) as number;
  return offers.map((o) => {
    const limit = isKnownRetailer(o.store, o.storeDomain) ? 0.35 : o.tags.includes('Unverified seller') ? 0.75 : 0.6;
    if (o.price >= typical * limit) return o;
    const below = Math.round((1 - o.price / typical) * 100);
    return {
      ...o,
      priceWarning: `${below}% below the usual ${formatMoney(typical, o.currency)}. It could be a fake, a used item or a different product, so check the seller first.`,
      tags: o.tags.includes('Check this price') ? o.tags : [...o.tags, 'Check this price'],
    };
  });
}

/** Notes offers whose title names a different color than `wanted` (a search or product title). */
export function markColorMismatches<T extends Offer>(offers: T[], wanted?: string): T[] {
  if (!wanted) return offers;
  return offers.map((o) => {
    const note = colorMismatch(wanted, o.title);
    if (!note) return o;
    return { ...o, colorNote: note, tags: o.tags.includes('Different color') ? o.tags : [...o.tags, 'Different color'] };
  });
}

/** Flags luxury bags priced below anything the brand sells new (see lib/luxury.ts). */
export function markLuxuryFloors<T extends Offer & { brand?: string }>(offers: T[]): T[] {
  return offers.map((o) => {
    if (o.priceWarning) return o;
    const warning = luxuryFloorWarning(o.title, o.price, o.currency, o.brand);
    if (!warning) return o;
    return { ...o, priceWarning: warning, tags: o.tags.includes('Check this price') ? o.tags : [...o.tags, 'Check this price'] };
  });
}

/** Applies the inflated-discount notes to the offers (adds a tag and a note). */
export function markInflatedDiscounts<T extends Offer>(offers: T[], history?: HistoryResponse | null): T[] {
  const notes = findInflatedDiscounts(offers, history);
  return offers.map((o) => {
    const note = notes.get(o.id);
    if (!note) return o;
    return { ...o, discountNote: note, tags: [...o.tags.filter((t) => !/% off$/.test(t)), 'Inflated discount'] };
  });
}

/** Rates how good the current best price is, from 0 (wait) to 100 (great deal). */
export function computeDealScore(offers: Offer[], history: HistoryResponse | null): DealScore | null {
  const best = cheapestOf(offers);
  if (!best) return null;
  const money = (n: number) => formatMoney(n, best.currency);
  const current = effectiveTotal(best);
  const reasons: string[] = [];

  // 1. How the best price compares with what other stores charge right now.
  const others = offers.filter((o) => o.id !== best.id && o.inStock !== false).map(effectiveTotal);
  let storeScore = 55;
  const typical = median(others);
  if (typical != null && typical > 0) {
    const savings = (typical - current) / typical;
    storeScore = Math.max(25, Math.min(100, 50 + savings * 250));
    if (savings >= 0.03) reasons.push(`${money(typical - current)} less than the typical store (${Math.round(savings * 100)}% below)`);
    else reasons.push('About the same price at most stores');
  } else {
    reasons.push('Only one store has it right now');
  }

  // 2. How today's price compares with the price history we've tracked.
  let historyScore: number | null = null;
  if (historyIsUsable(history) && history.lowest && history.highest && history.average) {
    const lo = Math.min(history.lowest.total, current);
    const hi = Math.max(history.highest.total, current);
    historyScore = hi > lo ? 20 + 80 * ((hi - current) / (hi - lo)) : 70;
    const vsAvg = (history.average - current) / history.average;
    if (current <= history.lowest.total * 1.005) reasons.unshift('Lowest price since we started tracking it');
    else if (vsAvg >= 0.03) reasons.unshift(`${Math.round(vsAvg * 100)}% below its usual price`);
    else if (vsAvg <= -0.03) reasons.unshift(`${Math.round(-vsAvg * 100)}% above its usual price`);
    else reasons.unshift('Close to its usual price');
  }

  // 3. A real (not inflated) discount at the best store nudges the score up.
  let bonus = 0;
  if (best.originalPrice && !best.discountNote) {
    bonus = 4;
    reasons.push(`On sale at ${best.store}`);
  }
  if (best.discountNote) reasons.push('The advertised discount looks inflated');

  // With one store and no history there's nothing to compare against.
  if (historyScore == null && typical == null) return null;

  const raw = historyScore != null ? 0.6 * historyScore + 0.4 * storeScore : storeScore;
  const score = Math.round(Math.max(0, Math.min(100, raw + bonus)));
  const basis = historyScore != null ? 'history' : 'stores';

  if (score >= 80) return { score, tone: 'great', label: 'Great deal', advice: 'Buy now. This is a strong price.', reasons, basis };
  if (score >= 62) return { score, tone: 'good', label: 'Good price', advice: 'A good time to buy.', reasons, basis };
  if (score >= 45) {
    const advice = basis === 'history'
      ? 'Fine if you need it soon, but it has been cheaper. Set an alert to catch a drop.'
      : 'Similar price at most stores. Set an alert to catch a sale.';
    return { score, tone: 'fair', label: 'Fair price', advice, reasons, basis };
  }
  return { score, tone: 'high', label: 'Wait for a drop', advice: 'It has been cheaper. Set an alert and wait.', reasons, basis };
}
