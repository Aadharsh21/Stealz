// Google Shopping data through SerpApi (https://serpapi.com).
//  - google_shopping: search results (about 40 listings, one store each)
//  - google_immersive_product: every store selling one product, with shipping, tax, total,
//    delivery and returns notes
//  - locations.json (free): turns a ZIP / city into Google's canonical location name

import { COUNTRIES } from '../countries';
import { config } from '../config';
import { cacheGet, cacheSet } from '../cache';
import { parseMoney, statedPercent } from '../money';
import type { ResolvedLocation } from '../types';
import { ProviderError } from './types';
import type { ProviderItem, ProviderProductResult, ProviderSearchResult } from './types';

const SEARCH_URL = 'https://serpapi.com/search.json';
const LOCATIONS_URL = 'https://serpapi.com/locations.json';

// SerpApi responses are loosely typed JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const asArray = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

async function serpRequest(params: Record<string, string>, timeoutMs = 25_000): Promise<Json> {
  const key = config().serpApiKey;
  if (!key) throw new ProviderError('SERPAPI_API_KEY is not set', 500, 'config');
  const url = `${SEARCH_URL}?${new URLSearchParams({ ...params, api_key: key }).toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' }, cache: 'no-store' });
  } catch (err) {
    const timedOut = (err as Error).name === 'TimeoutError';
    throw new ProviderError(`The shopping data service ${timedOut ? 'took too long to answer' : "couldn't be reached"}`, 504);
  }
  let body: Json = {};
  try {
    body = (await res.json()) as Json;
  } catch {
    // non-JSON error page
  }
  const message = typeof body.error === 'string' ? body.error : '';
  if (!res.ok || message) {
    if (/hasn.t returned any results|returned no results/i.test(message)) return { ...body, shopping_results: [] };
    if (/unsupported .*location|location.*(not|isn.t) supported|invalid .*location/i.test(message)) {
      throw new ProviderError(message, 400, 'provider');
    }
    if (res.status === 429 || /run out of searches|searches per month|throughput|rate limit/i.test(message)) {
      throw new ProviderError('The live search plan limit has been reached for now', 503, 'budget');
    }
    if (res.status === 401 || /invalid api key|api key/i.test(message)) {
      throw new ProviderError('SerpApi rejected the API key. Check SERPAPI_API_KEY.', 500, 'config');
    }
    throw new ProviderError(message || `SerpApi returned HTTP ${res.status}`, 502);
  }
  return body;
}

interface SerpLocation {
  name: string;
  canonical_name: string;
  country_code: string;
  target_type: string;
}

async function lookupLocations(q: string): Promise<SerpLocation[]> {
  const res = await fetch(`${LOCATIONS_URL}?${new URLSearchParams({ q, limit: '10' })}`, {
    signal: AbortSignal.timeout(4000),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as SerpLocation[]) : [];
}

async function findLocation(loc: ResolvedLocation): Promise<string | undefined> {
  const inCountry = (l: SerpLocation) => l.country_code?.toUpperCase() === loc.country;
  const region = loc.region?.toLowerCase();
  if (loc.postalCode) {
    // Google targets UK postcodes by district ("SW1A"), not the full postcode.
    const code = loc.country === 'GB' ? loc.postalCode.slice(0, -3) : loc.postalCode;
    const hits = (await lookupLocations(code)).filter(inCountry);
    const exact = hits.find((l) => l.target_type === 'Postal Code' && l.name.replace(/\s+/g, '').toUpperCase() === code);
    if (exact) return exact.canonical_name;
  }
  if (loc.city) {
    const city = loc.city.toLowerCase();
    const hits = (await lookupLocations(loc.city)).filter(inCountry);
    const cities = hits.filter((l) => l.name.toLowerCase() === city && l.target_type !== 'Postal Code');
    const pick = (region && cities.find((l) => l.canonical_name.toLowerCase().includes(region))) || cities[0];
    if (pick) return pick.canonical_name;
  }
  if (loc.region) {
    const hits = (await lookupLocations(loc.region)).filter(inCountry);
    const pick = hits.find((l) => l.name.toLowerCase() === region);
    if (pick) return pick.canonical_name;
  }
  return undefined;
}

/** Google's canonical location for the shopper (e.g. "85281,Arizona,United States"). Cached 30 days. */
export async function googleLocationFor(loc: ResolvedLocation): Promise<string | undefined> {
  const key = `gloc:v1:${loc.country}:${loc.postalCode ?? ''}:${(loc.city ?? '').toLowerCase()}:${(loc.region ?? '').toLowerCase()}`;
  const cached = await cacheGet<{ name: string | null }>(key);
  if (cached) return cached.name ?? undefined;
  let name: string | undefined;
  try {
    name = await findLocation(loc);
  } catch {
    return undefined; // network problem: don't cache, just search country-wide this time
  }
  await cacheSet(key, { name: name ?? null }, name ? 30 * 86400 : 6 * 3600);
  return name;
}

function firstImage(r: Json): string | undefined {
  const thumbs = asArray(r.thumbnails).filter(isString) as unknown as string[];
  return thumbs[0] ?? str(r.thumbnail) ?? str(r.serpapi_thumbnail);
}

/** Converts google_shopping results into provider items. Exported for tests. */
export function parseShoppingResults(data: Json): ProviderItem[] {
  const rows: Json[] = [...asArray(data.shopping_results)];
  for (const category of asArray(data.categorized_shopping_results)) rows.push(...asArray(category.shopping_results));
  for (const ad of asArray(data.inline_shopping_results)) rows.push({ ...ad, _sponsored: true });

  const items: ProviderItem[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const title = str(r.title);
    const store = str(r.source);
    const price = num(r.extracted_price) ?? parseMoney(r.price);
    if (!title || !store || price == null || price <= 0) continue;
    const dedupeKey = `${str(r.product_id) ?? title.toLowerCase()}|${store.toLowerCase()}|${price}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const extensions = asArray(r.extensions).filter(isString) as unknown as string[];
    const nearby = extensions.find((e) => /(in store|nearby|pick ?up|\d\s?(mi|km)\b)/i.test(e));
    const oldPrice = num(r.extracted_old_price) ?? parseMoney(r.old_price) ?? undefined;
    const notes = [str(r.delivery), ...extensions.filter((e) => e !== nearby)].filter(isString) as string[];
    items.push({
      source: 'google',
      title,
      store,
      storeLogo: str(r.source_icon),
      link: str(r.link),
      googleLink: str(r.product_link),
      image: firstImage(r),
      price,
      originalPrice: oldPrice,
      discountPct: oldPrice == null ? statedPercent([str(r.tag), ...extensions]) : undefined,
      rating: num(r.rating),
      reviews: num(r.reviews),
      notes,
      productId: str(r.product_id),
      pageToken: str(r.immersive_product_page_token),
      multipleSources: r.multiple_sources === true,
      condition: str(r.second_hand_condition),
      sponsored: r._sponsored === true,
      nearby,
    });
  }
  return items;
}

/** Converts google_immersive_product results (all stores for one product). Exported for tests. */
export function parseImmersiveProduct(pr: Json): ProviderProductResult {
  const about = (pr.about_the_product ?? {}) as Json;
  const rawFeatures = Array.isArray(about.features) ? about.features : about.features ? [about.features] : [];
  const images = (asArray(pr.thumbnails).filter(isString) as unknown as string[]).slice(0, 8);
  const details = {
    title: str(pr.title),
    brand: str(pr.brand),
    images,
    rating: num(pr.rating),
    reviews: num(pr.reviews),
    description: str(about.description),
    features: (rawFeatures as Json[])
      .map((f) => ({ title: str(f?.title) ?? '', value: str(f?.value) ?? '' }))
      .filter((f) => f.title && f.value)
      .slice(0, 12),
  };

  const items: ProviderItem[] = [];
  for (const s of asArray(pr.stores)) {
    const store = str(s.name);
    if (!store) continue;
    let price = num(s.extracted_price) ?? parseMoney(s.price);
    const months = num(s.monthly_payment_duration);
    const installment = months != null && months > 1;
    if (installment) {
      // Installment listings show the monthly amount; compare on the full price instead.
      const full = num(s.extracted_total);
      if (full == null) continue;
      price = full;
    }
    if (price == null || price <= 0) continue;
    items.push({
      source: 'google',
      title: str(s.title) ?? details.title ?? '',
      store,
      storeLogo: str(s.logo),
      link: str(s.link),
      image: images[0],
      price,
      originalPrice: installment ? undefined : num(s.extracted_original_price),
      discountPct: installment || num(s.extracted_original_price) != null ? undefined : statedPercent([str(s.discount), str(s.tag)]),
      rating: num(s.rating),
      reviews: num(s.reviews),
      notes: asArray(s.details_and_offers).filter(isString) as unknown as string[],
      shippingField: str(s.shipping),
      shippingExtracted: num(s.shipping_extracted),
      providerTotal: installment ? undefined : num(s.extracted_total),
      taxAmount: num(s.extracted_estimated_tax),
      coupon: str(s.coupon),
      paymentNote: str(s.payment_methods),
      tags: [str(s.tag), installment ? 'Installment plan' : undefined].filter(isString) as string[],
    });
  }
  return { details, items, notices: [] };
}

export async function searchGoogleShopping(
  query: string,
  loc: ResolvedLocation,
  opts: { onSale?: boolean } = {},
): Promise<ProviderSearchResult> {
  const cfg = COUNTRIES[loc.country];
  const base: Record<string, string> = { engine: 'google_shopping', q: query, gl: cfg.gl, hl: cfg.hl, google_domain: cfg.googleDomain };
  // Google's own "On sale" filter: only products the store marks as reduced.
  if (opts.onSale) base.on_sale = 'true';
  const notices: string[] = [];
  const googleLocation = await googleLocationFor(loc);
  let data: Json;
  try {
    data = await serpRequest(googleLocation ? { ...base, location: googleLocation } : base);
  } catch (err) {
    if (googleLocation && err instanceof ProviderError && err.status === 400) {
      data = await serpRequest(base);
      notices.push(`Results are for ${cfg.inPhrase}; your exact area couldn't be used.`);
    } else {
      throw err;
    }
  }
  return { items: parseShoppingResults(data), sources: ['Google Shopping'], notices };
}

export async function googleProduct(pageToken: string): Promise<ProviderProductResult> {
  const data = await serpRequest({ engine: 'google_immersive_product', page_token: pageToken, more_stores: 'true' });
  if (!data.product_results) throw new ProviderError('This product page has expired', 404, 'not_found');
  return parseImmersiveProduct(data.product_results as Json);
}
