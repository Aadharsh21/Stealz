// Shared types used by the API routes and the UI.

export type CountryCode = 'US' | 'AE' | 'IN';
export type CurrencyCode = 'USD' | 'AED' | 'INR';
export type DataSource = 'google' | 'ebay' | 'demo';

/** Where the shopper is. Everything except `country` is optional. */
export interface UserLocation {
  country: CountryCode;
  postalCode?: string;
  city?: string;
  /** State, emirate or province name, e.g. "Arizona", "Dubai", "Karnataka". */
  region?: string;
  /** Short region code, e.g. "AZ". */
  regionCode?: string;
  lat?: number;
  lng?: number;
  source: 'ip' | 'gps' | 'manual' | 'default';
}

export interface ResolvedLocation extends UserLocation {
  /** Human label, e.g. "Tempe, AZ 85281". */
  label: string;
  /** IANA time zone used to work out "today" for delivery dates. */
  timeZone: string;
  /** Google canonical location used for the live search (if any). */
  googleLocation?: string;
}

export type DeliverySpeed = 'today' | 'next-day' | 'fast' | 'standard' | 'slow' | 'unknown';

export interface DeliveryEstimate {
  /** Calendar days from today to the earliest arrival, or null if unknown. */
  minDays: number | null;
  /** Calendar days from today to the latest arrival, or null if unknown. */
  maxDays: number | null;
  /** YYYY-MM-DD */
  minDate: string | null;
  /** YYYY-MM-DD */
  maxDate: string | null;
  /** Short human label, e.g. "Arrives Tue, Nov 4". */
  label: string;
  speed: DeliverySpeed;
  /** The text the store or Google showed, for transparency. */
  raw?: string;
}

export interface ShippingInfo {
  /** Shipping cost, 0 when free, null when the store didn't say. */
  cost: number | null;
  free: boolean;
  /** Free shipping only above this order value. */
  threshold?: number;
  label: string;
}

export type TaxMode = 'included' | 'estimated' | 'exact' | 'none' | 'unknown';

export interface TaxInfo {
  /** Tax added on top of the price (0 when included in the price or exempt). */
  amount: number | null;
  mode: TaxMode;
  rate?: number;
  note: string;
}

export interface ReturnsInfo {
  label: string;
  free?: boolean;
  days?: number;
  none?: boolean;
}

/** One store's offer for an item, normalized across sources. */
export interface Offer {
  id: string;
  source: DataSource;
  store: string;
  storeDomain?: string;
  storeLogo?: string;
  link?: string;
  title: string;
  image?: string;
  price: number;
  originalPrice?: number;
  currency: CurrencyCode;
  shipping: ShippingInfo;
  tax: TaxInfo;
  /** price + shipping (when known) + tax (when added on top). */
  total: number;
  /** False when shipping cost is unknown, so the total may be higher. */
  totalIsComplete: boolean;
  delivery: DeliveryEstimate;
  returns?: ReturnsInfo;
  rating?: number;
  reviews?: number;
  isBrandStore?: boolean;
  isMarketplace?: boolean;
  inStock?: boolean;
  coupon?: string;
  paymentNote?: string;
  /** Marketplace seller reputation, e.g. "99.4% positive feedback". */
  sellerNote?: string;
  /** Set when the store's "was" price looks inflated compared with other stores. */
  discountNote?: string;
  /** "In store, 3 mi" style availability near the shopper. */
  nearby?: string;
  tags: string[];
}

/** A search result row: an offer plus what it is and how well it matches. */
export interface Listing extends Offer {
  productKey: string;
  brand?: string;
  /** 0..1, how well the title matches the search. */
  match: number;
  /** Encoded ProductRef used to open the comparison page. */
  ref: string;
  /** Google says more stores sell this exact product. */
  multipleSources?: boolean;
  /** A Google Shopping page for the product, when there's no direct store link. */
  googleLink?: string;
}

/** Everything needed to reopen a product's comparison page from a URL. */
export interface ProductRef {
  v: 1;
  p: DataSource;
  /** Product key (stable id used for history and grouping). */
  k: string;
  /** The search that found it. */
  q: string;
  title: string;
  img?: string;
  /** Google immersive product token. */
  t?: string;
  /** Google catalog product id. */
  pid?: string;
}

export interface ProductGroup {
  key: string;
  title: string;
  brand?: string;
  image?: string;
  listings: Listing[];
  bestTotal: number;
  maxTotal: number;
  storeCount: number;
  fastest?: Listing;
  match: number;
  ref: string;
  multipleSources: boolean;
  onSale: boolean;
}

export interface SearchSummary {
  cheapest?: Listing;
  fastest?: Listing;
  bestValue?: Listing;
  bestValueReason?: string;
  /** Whether the summary only covers listings that match the search closely. */
  scope: 'exact' | 'all';
}

export interface SearchResponse {
  query: string;
  location: ResolvedLocation;
  currency: CurrencyCode;
  groups: ProductGroup[];
  listings: Listing[];
  summary: SearchSummary;
  stores: { name: string; count: number }[];
  sources: string[];
  demo: boolean;
  cached: boolean;
  fetchedAt: string;
  notices: string[];
  /** How many listings were hidden for being used, pre-owned or refurbished. */
  hiddenUsed: number;
}

export interface HistoryPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Lowest total seen that day. */
  low: number;
  store?: string;
}

export interface HistoryResponse {
  points: HistoryPoint[];
  lowest?: { total: number; date: string; store?: string };
  highest?: { total: number; date: string; store?: string };
  average?: number;
  current?: number;
  since?: string;
  /** True for generated demo history. */
  synthetic?: boolean;
}

/** 0-100 rating of how good the current best price is, with the reasons behind it. */
export interface DealScore {
  score: number;
  tone: 'great' | 'good' | 'fair' | 'high';
  label: string;
  advice: string;
  reasons: string[];
  /** Whether the score uses tracked price history or only today's store prices. */
  basis: 'history' | 'stores';
}

export interface ProductDetails {
  key: string;
  title: string;
  brand?: string;
  images: string[];
  rating?: number;
  reviews?: number;
  description?: string;
  features?: { title: string; value: string }[];
}

export interface ProductResponse {
  ref: ProductRef;
  product: ProductDetails;
  offers: Offer[];
  location: ResolvedLocation;
  currency: CurrencyCode;
  history: HistoryResponse | null;
  deal: DealScore | null;
  /** Cheaper similar items from the same search. */
  similar: Listing[];
  demo: boolean;
  cached: boolean;
  fetchedAt: string;
  notices: string[];
  alertsEnabled: boolean;
}

export interface ApiError {
  error: string;
  code: 'bad_request' | 'rate_limited' | 'budget' | 'provider' | 'not_found' | 'server';
  retryAfter?: number;
}
