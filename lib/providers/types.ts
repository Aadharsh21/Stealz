import type { DataSource, ProductDetails } from '../types';

/**
 * What a data source returns before normalization. Kept as plain JSON so it can be cached;
 * delivery dates and taxes are worked out fresh on every request from these raw notes.
 */
export interface ProviderItem {
  source: DataSource;
  title: string;
  store: string;
  storeLogo?: string;
  /** Direct link to the store's product page. */
  link?: string;
  /** Google Shopping page for the product (used when there's no direct store link). */
  googleLink?: string;
  image?: string;
  price: number;
  originalPrice?: number;
  /** Percent off as the listing states it ("51% OFF"), when there's no "was" price. */
  discountPct?: number;
  rating?: number;
  reviews?: number;
  /** Free-text notes from the listing: "Free delivery by Mon", "Free 30-day returns", ... */
  notes: string[];
  /** Google's shipping field ("Free", "+ $4.00") and its parsed number. */
  shippingField?: string;
  shippingExtracted?: number;
  /** Shipping cost already known as a number (eBay); 0 = free. */
  shippingCost?: number | null;
  /** Delivery window as ISO timestamps (eBay). */
  deliveryWindow?: { min?: string; max?: string } | null;
  /** The store's total (price + shipping + tax) when the source provides it. */
  providerTotal?: number;
  /** Tax amount reported by the source for the shopper's location. */
  taxAmount?: number;
  productId?: string;
  pageToken?: string;
  multipleSources?: boolean;
  condition?: string;
  sponsored?: boolean;
  nearby?: string;
  coupon?: string;
  paymentNote?: string;
  sellerNote?: string;
  tags?: string[];
}

export interface ProviderSearchResult {
  items: ProviderItem[];
  sources: string[];
  notices: string[];
}

export interface ProviderProductResult {
  details: Partial<ProductDetails>;
  items: ProviderItem[];
  notices: string[];
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
    public kind: 'provider' | 'budget' | 'config' | 'not_found' = 'provider',
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export type { DataSource };
