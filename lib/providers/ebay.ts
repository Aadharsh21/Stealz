// eBay Browse API (free, US only). Returns new, fixed-price listings in Clothing, Shoes &
// Accessories, with exact shipping cost and delivery dates for the shopper's ZIP code.
// Docs: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search

import { config } from '../config';
import type { ResolvedLocation } from '../types';
import { ProviderError } from './types';
import type { ProviderItem } from './types';

const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const CLOTHING_SHOES_ACCESSORIES = '11450';

let cachedToken: { value: string; expires: number } | null = null;

async function appToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const { ebayClientId, ebayClientSecret } = config();
  const basic = btoa(`${ebayClientId}:${ebayClientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${basic}` },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new ProviderError(`eBay sign-in failed (HTTP ${res.status})`, 502, 'config');
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new ProviderError('eBay did not return an access token', 502, 'config');
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 7200) * 1000 };
  return cachedToken.value;
}

interface EbayAmount {
  value?: string;
  currency?: string;
}

interface EbayItem {
  title?: string;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  price?: EbayAmount;
  marketingPrice?: { originalPrice?: EbayAmount; discountPercentage?: string };
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
  condition?: string;
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
  shippingOptions?: {
    shippingCostType?: string;
    shippingCost?: EbayAmount;
    minEstimatedDeliveryDate?: string;
    maxEstimatedDeliveryDate?: string;
  }[];
  topRatedBuyingExperience?: boolean;
}

const amount = (a?: EbayAmount): number | undefined => {
  const n = Number(a?.value);
  return a?.value != null && Number.isFinite(n) ? n : undefined;
};

/** Converts eBay item summaries to provider items. Exported for tests. */
export function parseEbayItems(items: EbayItem[]): ProviderItem[] {
  const out: ProviderItem[] = [];
  for (const it of items) {
    const price = amount(it.price);
    if (!it.title || price == null || price <= 0 || (it.price?.currency && it.price.currency !== 'USD')) continue;
    const ship = it.shippingOptions?.[0];
    const shipCost = amount(ship?.shippingCost);
    // Seller usernames are eBay user data. They're never kept, so nothing about eBay members is
    // stored in the cache or price history (required for eBay's "not persisting eBay data" opt-out).
    const feedback = it.seller?.feedbackPercentage;
    const original = amount(it.marketingPrice?.originalPrice);
    out.push({
      source: 'ebay',
      title: it.title,
      store: 'eBay',
      storeLogo: 'https://www.google.com/s2/favicons?domain=ebay.com&sz=64',
      link: it.itemAffiliateWebUrl ?? it.itemWebUrl,
      image: it.image?.imageUrl ?? it.thumbnailImages?.[0]?.imageUrl,
      price,
      originalPrice: original && original > price ? original : undefined,
      notes: [],
      shippingCost: shipCost ?? null,
      deliveryWindow:
        ship?.minEstimatedDeliveryDate || ship?.maxEstimatedDeliveryDate
          ? { min: ship.minEstimatedDeliveryDate, max: ship.maxEstimatedDeliveryDate }
          : null,
      condition: it.condition,
      sellerNote: feedback ? `${feedback}% positive feedback${it.seller?.feedbackScore ? ` (${it.seller.feedbackScore.toLocaleString('en-US')})` : ''}` : undefined,
      tags: it.topRatedBuyingExperience ? ['Top rated seller'] : [],
    });
  }
  return out;
}

export async function searchEbay(query: string, loc: ResolvedLocation, limit = 30): Promise<ProviderItem[]> {
  if (loc.country !== 'US') return [];
  const token = await appToken();
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    category_ids: CLOTHING_SHOES_ACCESSORIES,
    filter: 'conditionIds:{1000},buyingOptions:{FIXED_PRICE},deliveryCountry:US,priceCurrency:USD',
  });
  const context = [`contextualLocation=${encodeURIComponent(`country=US${loc.postalCode ? `,zip=${loc.postalCode}` : ''}`)}`];
  const campaign = config().ebayCampaignId;
  if (campaign) context.push(`affiliateCampaignId=${campaign}`);
  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'X-EBAY-C-ENDUSERCTX': context.join(','),
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new ProviderError(`eBay search failed (HTTP ${res.status})`, 502);
  const data = (await res.json()) as { itemSummaries?: EbayItem[] };
  return parseEbayItems(data.itemSummaries ?? []);
}
