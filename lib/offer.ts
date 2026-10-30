// Builds a normalized Offer from what a provider knows, filling in tax, totals and badges.

import type {
  CountryCode, CurrencyCode, DataSource, DeliveryEstimate, Offer, ReturnsInfo, ShippingInfo, TaxInfo,
} from './types';
import { COUNTRIES } from './countries';
import { makeShipping, unknownDelivery } from './delivery';
import type { ParseContext } from './delivery';
import { round2 } from './money';
import { cleanStoreName, domainOf, faviconFor, isBrandStore, isLowTrustStore, isMarketplace, isSuspiciousStore } from './stores';
import { taxFor } from './tax';
import { cleanTitle, hash32 } from './text';

export interface RawOffer {
  source: DataSource;
  store: string;
  link?: string;
  storeLogo?: string;
  title: string;
  image?: string;
  price: number;
  originalPrice?: number;
  shipping?: ShippingInfo | null;
  /** Exact tax from the provider, when it has one. */
  tax?: TaxInfo | null;
  /** Provider's own total (price + shipping + tax), used to fill gaps. */
  providerTotal?: number;
  delivery?: DeliveryEstimate | null;
  returns?: ReturnsInfo;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  coupon?: string;
  paymentNote?: string;
  sellerNote?: string;
  nearby?: string;
  brand?: string;
  tags?: string[];
}

export interface OfferContext extends ParseContext {
  country: CountryCode;
  currency: CurrencyCode;
  regionCode?: string;
  postalCode?: string;
}

export function discountPercent(price: number, original?: number): number | null {
  if (!original || original <= price || price <= 0) return null;
  const pct = Math.round(((original - price) / original) * 100);
  return pct >= 3 && pct <= 95 ? pct : null;
}

export function finalizeOffer(raw: RawOffer, ctx: OfferContext): Offer {
  const title = cleanTitle(raw.title);
  const domain = domainOf(raw.link);
  let shipping = raw.shipping ?? makeShipping(ctx, null);
  const tax = raw.tax ?? taxFor(ctx.country, raw.price, title, ctx.regionCode, ctx.postalCode);
  const addedTax = tax.mode === 'estimated' || tax.mode === 'exact' ? tax.amount ?? 0 : 0;

  // If the provider gave a total but no shipping cost, the difference is the shipping.
  if (shipping.cost == null && raw.providerTotal != null) {
    const inferred = round2(raw.providerTotal - raw.price - addedTax);
    if (inferred >= 0 && inferred < raw.price) shipping = makeShipping(ctx, inferred);
  }
  const computed = round2(raw.price + (shipping.cost ?? 0) + addedTax);
  const total = raw.providerTotal != null && raw.providerTotal >= raw.price && Math.abs(raw.providerTotal - computed) <= Math.max(1, computed * 0.15)
    ? round2(raw.providerTotal)
    : computed;

  const tags = new Set(raw.tags ?? []);
  const pct = discountPercent(raw.price, raw.originalPrice);
  if (pct != null) tags.add(`${pct}% off`);
  if (raw.coupon) tags.add('Coupon');
  const marketplace = raw.source === 'ebay' || isMarketplace(raw.store, domain);
  if (isLowTrustStore(raw.store, domain) || isSuspiciousStore(raw.store, domain, ctx.country)) tags.add('Unverified seller');

  return {
    id: hash32(`${raw.source}|${raw.store}|${title}|${raw.price}|${raw.link ?? ''}`),
    source: raw.source,
    store: cleanStoreName(raw.store),
    storeDomain: domain,
    storeLogo: raw.storeLogo ?? faviconFor(domain),
    link: raw.link,
    title,
    image: raw.image,
    price: round2(raw.price),
    originalPrice: pct != null ? round2(raw.originalPrice as number) : undefined,
    currency: ctx.currency ?? COUNTRIES[ctx.country].currency,
    shipping,
    tax,
    total,
    totalIsComplete: shipping.cost != null,
    delivery: raw.delivery ?? unknownDelivery(),
    returns: raw.returns,
    rating: raw.rating && raw.rating > 0 && raw.rating <= 5 ? raw.rating : undefined,
    reviews: raw.reviews && raw.reviews > 0 ? raw.reviews : undefined,
    isBrandStore: isBrandStore(raw.store, raw.brand, domain),
    isMarketplace: marketplace,
    inStock: raw.inStock,
    coupon: raw.coupon,
    paymentNote: raw.paymentNote,
    sellerNote: raw.sellerNote,
    nearby: raw.nearby,
    tags: [...tags],
  };
}
