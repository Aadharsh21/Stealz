// Price floors for new bags from luxury houses. A "new Chanel bag" for $130 is almost always a
// fake, a rental, a used item or a look-alike, so those listings are flagged instead of ranked.

import type { CurrencyCode } from './types';
import { formatMoney } from './money';
import { detectBrand, normalize } from './text';

/** Roughly the lowest price of a new bag from each house, in US dollars. */
const BAG_FLOORS_USD: Record<string, number> = {
  chanel: 2500,
  hermes: 3000,
  'louis vuitton': 900,
  dior: 1500,
  'christian dior': 1500,
  'saint laurent': 800,
  ysl: 800,
  gucci: 700,
  prada: 800,
  'miu miu': 900,
  'bottega veneta': 1200,
  celine: 1200,
  fendi: 1000,
  loewe: 1000,
  balenciaga: 800,
  goyard: 1200,
  valentino: 900,
  givenchy: 800,
  'the row': 1000,
  burberry: 600,
};

/** Rough conversion so the same floors work for UK, UAE and Indian prices. */
const FROM_USD: Record<CurrencyCode, number> = { USD: 1, GBP: 0.78, AED: 3.67, INR: 83 };

const BAG = /\b(bag|bags|tote|crossbody|cross body|shoulder|flap|satchel|clutch|backpack|hobo|bucket|baguette|saddle|purse|handbag|woc)\b|\bwallet on (a )?chain\b/;
const SMALL_GOODS = /\b(wallet|card holder|cardholder|card case|key pouch|key holder|coin purse|pouch)\b/;

/** A warning when a new luxury bag (or wallet) costs far less than the brand ever charges. */
export function luxuryFloorWarning(title: string, price: number, currency: CurrencyCode, brand = detectBrand(title)): string | null {
  if (!brand) return null;
  const floorUsd = BAG_FLOORS_USD[normalize(brand)];
  if (!floorUsd) return null;
  const t = normalize(title);
  const isBag = BAG.test(t);
  const isSmall = !isBag && SMALL_GOODS.test(t);
  if (!isBag && !isSmall) return null;
  const floor = Math.round(floorUsd * (isSmall ? 0.25 : 1) * FROM_USD[currency]);
  if (price >= floor) return null;
  const what = isSmall ? `${brand} wallets and small leather goods` : `${brand} bags`;
  return `New ${what} rarely sell for under ${formatMoney(floor, currency)}. This could be a fake, a rental, a used item or a look-alike, so check the seller first.`;
}
