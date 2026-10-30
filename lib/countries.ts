import type { CountryCode, CurrencyCode } from './types';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  short: string;
  currency: CurrencyCode;
  locale: string;
  /** Google country and language parameters. */
  gl: string;
  hl: string;
  googleDomain: string;
  defaultTimeZone: string;
  /** Postal code input, or null when the country doesn't use one (UAE). */
  postal: { label: string; placeholder: string; pattern: RegExp; length: number } | null;
  /** Whether prices shown to shoppers already include sales tax / VAT / GST. */
  taxIncluded: boolean;
  taxName: string;
  /** Days that don't count as business days. 0 = Sunday, 6 = Saturday. */
  weekend: number[];
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    short: 'US',
    currency: 'USD',
    locale: 'en-US',
    gl: 'us',
    hl: 'en',
    googleDomain: 'google.com',
    defaultTimeZone: 'America/New_York',
    postal: { label: 'ZIP code', placeholder: 'e.g. 85281', pattern: /^\d{5}$/, length: 5 },
    taxIncluded: false,
    taxName: 'sales tax',
    weekend: [0, 6],
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    short: 'UAE',
    currency: 'AED',
    locale: 'en-AE',
    gl: 'ae',
    hl: 'en',
    googleDomain: 'google.ae',
    defaultTimeZone: 'Asia/Dubai',
    postal: null,
    taxIncluded: true,
    taxName: 'VAT',
    weekend: [0, 6],
  },
  IN: {
    code: 'IN',
    name: 'India',
    short: 'India',
    currency: 'INR',
    locale: 'en-IN',
    gl: 'in',
    hl: 'en',
    googleDomain: 'google.co.in',
    defaultTimeZone: 'Asia/Kolkata',
    postal: { label: 'PIN code', placeholder: 'e.g. 560001', pattern: /^\d{6}$/, length: 6 },
    taxIncluded: true,
    taxName: 'GST',
    weekend: [0],
  },
};

export const COUNTRY_CODES: CountryCode[] = ['US', 'AE', 'IN'];

export function isCountryCode(value: unknown): value is CountryCode {
  return value === 'US' || value === 'AE' || value === 'IN';
}

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const US_STATE_TIME_ZONES: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York',
  DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis', IA: 'America/Chicago',
  KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago',
  NV: 'America/Los_Angeles', NH: 'America/New_York', NJ: 'America/New_York', NM: 'America/Denver',
  NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  UT: 'America/Denver', VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};

/** UAE emirates keyed by their ISO 3166-2 code (AE-DU = Dubai, AE-AZ = Abu Dhabi, ...). */
export const UAE_EMIRATES: Record<string, string> = {
  DU: 'Dubai',
  AZ: 'Abu Dhabi',
  SH: 'Sharjah',
  AJ: 'Ajman',
  RK: 'Ras Al Khaimah',
  FU: 'Fujairah',
  UQ: 'Umm Al Quwain',
};

/** Cities shoppers can pick in the UAE, with the emirate each belongs to. */
export const UAE_CITIES: { city: string; emirate: string }[] = [
  { city: 'Dubai', emirate: 'Dubai' },
  { city: 'Abu Dhabi', emirate: 'Abu Dhabi' },
  { city: 'Sharjah', emirate: 'Sharjah' },
  { city: 'Al Ain', emirate: 'Abu Dhabi' },
  { city: 'Ajman', emirate: 'Ajman' },
  { city: 'Ras Al Khaimah', emirate: 'Ras Al Khaimah' },
  { city: 'Fujairah', emirate: 'Fujairah' },
  { city: 'Umm Al Quwain', emirate: 'Umm Al Quwain' },
];

/** Indian states and union territories by ISO 3166-2 code (old and new codes both listed). */
export const INDIA_STATES: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam',
  BR: 'Bihar', CH: 'Chandigarh', CT: 'Chhattisgarh', CG: 'Chhattisgarh',
  DH: 'Dadra and Nagar Haveli and Daman and Diu', DN: 'Dadra and Nagar Haveli and Daman and Diu',
  DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh',
  LD: 'Lakshadweep', MP: 'Madhya Pradesh', MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya',
  MZ: 'Mizoram', NL: 'Nagaland', OR: 'Odisha', OD: 'Odisha', PB: 'Punjab', PY: 'Puducherry',
  RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu', TG: 'Telangana', TS: 'Telangana',
  TR: 'Tripura', UP: 'Uttar Pradesh', UT: 'Uttarakhand', UK: 'Uttarakhand', WB: 'West Bengal',
};

export function regionName(country: CountryCode, code?: string): string | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase().replace(/^[A-Z]{2}-/, '');
  if (country === 'US') return US_STATES[c];
  if (country === 'AE') return UAE_EMIRATES[c];
  return INDIA_STATES[c];
}

/** Reverse lookup: "Arizona" -> "AZ". */
export function regionCodeFromName(country: CountryCode, name?: string): string | undefined {
  if (!name) return undefined;
  const table = country === 'US' ? US_STATES : country === 'AE' ? UAE_EMIRATES : INDIA_STATES;
  const wanted = name.trim().toLowerCase();
  for (const [code, value] of Object.entries(table)) {
    if (value.toLowerCase() === wanted) return code;
  }
  return undefined;
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64 || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Best guess at the shopper's time zone. A valid browser time zone wins when it's plausible. */
export function timeZoneFor(country: CountryCode, regionCode?: string, browserTz?: string): string {
  if (isValidTimeZone(browserTz)) {
    // Only trust the browser zone if it is plausible for the chosen country.
    if (country === 'US' && (browserTz.startsWith('America/') || browserTz.startsWith('Pacific/Honolulu'))) return browserTz;
    if (country === 'AE' && browserTz === 'Asia/Dubai') return browserTz;
    if (country === 'IN' && (browserTz === 'Asia/Kolkata' || browserTz === 'Asia/Calcutta')) return 'Asia/Kolkata';
  }
  if (country === 'US' && regionCode) {
    const tz = US_STATE_TIME_ZONES[regionCode.toUpperCase()];
    if (tz) return tz;
  }
  return COUNTRIES[country].defaultTimeZone;
}
