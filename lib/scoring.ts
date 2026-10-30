// Ranks offers by what a shopper actually pays and how long they wait, with small nudges
// for trust (returns, marketplace sellers, ratings).

import type { Offer } from './types';
import { formatMoney } from './money';

/** 0 = only price matters, 1 = only delivery speed matters. */
export const DEFAULT_SPEED_WEIGHT = 0.35;
/** Days assumed when a store gives no delivery estimate. */
const UNKNOWN_DAYS = 9;

export function effectiveDays(o: Offer): number {
  return o.delivery.maxDays ?? o.delivery.minDays ?? UNKNOWN_DAYS;
}

/** Total with a cautious allowance when the store didn't list shipping. */
export function effectiveTotal(o: Offer): number {
  if (o.totalIsComplete) return o.total;
  const allowance = o.currency === 'INR' ? 79 : o.currency === 'AED' ? 15 : 6;
  return o.total + allowance;
}

export interface ScoredOffer<T extends Offer = Offer> {
  offer: T;
  score: number;
}

function available<T extends Offer>(offers: T[]): T[] {
  const inStock = offers.filter((o) => o.inStock !== false);
  return inStock.length ? inStock : offers;
}

/**
 * Lower score is better. Each extra day of waiting costs a share of the price that grows with
 * the speed weight: at the default weight a day is worth about 1% of the price.
 */
export function rankOffers<T extends Offer>(offers: T[], speedWeight = DEFAULT_SPEED_WEIGHT): ScoredOffer<T>[] {
  const list = available(offers);
  if (list.length === 0) return [];
  const w = Math.min(1, Math.max(0, speedWeight));
  const totals = list.map(effectiveTotal);
  const days = list.map(effectiveDays);
  const minTotal = Math.min(...totals);
  const minDays = Math.min(...days);
  const perDay = w >= 0.999 ? 1e6 : (w / (1 - w)) * 0.02;
  return list
    .map((offer, i) => {
      const priceRel = minTotal > 0 ? (totals[i] - minTotal) / minTotal : 0;
      let score = (w >= 0.999 ? 0 : priceRel) + perDay * (days[i] - minDays);
      if (w >= 0.999) score += priceRel * 0.001;
      if (offer.returns?.none) score += 0.04;
      else if (offer.returns?.free) score -= 0.01;
      if (offer.isMarketplace) score += 0.02;
      if (offer.tags.includes('Unverified seller')) score += 0.15;
      if (offer.isBrandStore) score -= 0.01;
      if (offer.rating != null && offer.rating < 3.5) score += 0.03;
      return { offer, score };
    })
    .sort((a, b) => a.score - b.score || a.offer.total - b.offer.total);
}

export function cheapestOf<T extends Offer>(offers: T[]): T | undefined {
  return [...available(offers)].sort(
    (a, b) => effectiveTotal(a) - effectiveTotal(b) || effectiveDays(a) - effectiveDays(b),
  )[0];
}

export function fastestOf<T extends Offer>(offers: T[]): T | undefined {
  const known = available(offers).filter((o) => o.delivery.maxDays != null);
  return [...known].sort((a, b) => effectiveDays(a) - effectiveDays(b) || effectiveTotal(a) - effectiveTotal(b))[0];
}

/** One plain sentence explaining why `best` is the recommended pick. */
export function explainPick(best: Offer, cheapest?: Offer, fastest?: Offer): string {
  const money = (n: number) => formatMoney(n, best.currency);
  const isCheapest = !cheapest || cheapest.id === best.id || effectiveTotal(cheapest) >= effectiveTotal(best);
  const isFastest = !fastest || fastest.id === best.id || effectiveDays(fastest) >= effectiveDays(best);
  const extras: string[] = [];
  if (best.returns?.free) extras.push('free returns');
  if (best.isBrandStore) extras.push('sold by the brand itself');
  const extra = extras.length ? `, with ${extras.join(' and ')}` : '';

  if (isCheapest && isFastest) return `Lowest total and the fastest delivery${extra}.`;
  if (isCheapest) {
    const label = best.delivery.label;
    const when = best.delivery.maxDays != null ? `, ${label.charAt(0).toLowerCase()}${label.slice(1)}` : '';
    return `Lowest total${when}${extra}.`;
  }
  const diff = Math.max(0, best.total - (cheapest as Offer).total);
  const cheapDays = cheapest ? effectiveDays(cheapest) : 0;
  const sooner = cheapDays - effectiveDays(best);
  if (sooner > 0) {
    const dayWord = sooner === 1 ? 'day' : 'days';
    return `Only ${money(diff)} more than the cheapest, but arrives ${sooner} ${dayWord} sooner${extra}.`;
  }
  if (diff < best.total * 0.03) return `Within ${money(diff)} of the cheapest${extra || ' from a more reliable seller'}.`;
  return `Best balance of price, delivery and seller trust${extra}.`;
}
