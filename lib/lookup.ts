// The Chrome extension's lookup: the product on the page a shopper is viewing, priced at every
// store for their location. Uses the regular search (same cache, limits and fake-shop filters).

import type { UserLocation } from './types';
import { config } from './config';
import { AppError } from './errors';
import type { LookupResponse } from './lookup-select';
import { lookupQuery, pickOffers } from './lookup-select';
import { productHref } from './ref';
import { runSearch } from './search';

export interface LookupInput {
  title: string;
  brand?: string;
  price?: number;
  currency?: string;
  color?: string;
  url?: string;
  location: UserLocation;
  tz?: string;
  ip: string;
}

function hostOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export async function runLookup(input: LookupInput): Promise<{ response: LookupResponse; background?: () => Promise<void> }> {
  const { query, color: titleColor } = lookupQuery(input.title, input.brand);
  if (query.length < 2) throw new AppError("We couldn't tell what this product is.", 400, 'bad_request');
  // A color like "001 Black" or "Black/Gold" still reads as black.
  const pageColor = input.color?.trim() || titleColor;

  const { response: search, background } = await runSearch({ query, location: input.location, tz: input.tz, ip: input.ip });
  const pick = pickOffers(search.listings, {
    pageColor,
    host: hostOf(input.url),
    pagePrice: input.price,
    pageCurrency: input.currency?.toUpperCase(),
    currency: search.currency,
  });
  const app = config().appUrl;
  const response: LookupResponse = {
    ...pick,
    query,
    pageColor,
    pagePrice: input.price,
    currency: search.currency,
    locationLabel: search.location.label,
    compareUrl: `${app}/search?q=${encodeURIComponent(query)}`,
    productUrl: pick.bestRef ? `${app}${productHref(pick.bestRef)}` : undefined,
    fetchedAt: search.fetchedAt,
    demo: search.demo,
    notices: search.notices,
  };
  return { response, background };
}
