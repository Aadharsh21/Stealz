// Shopper location: detection from Vercel's IP headers, validation of what the browser sends,
// and postal-code lookups (US ZIP / UK postcode / India PIN) to fill in the city and state.

import type { CountryCode, ResolvedLocation, UserLocation } from './types';
import {
  COUNTRIES, UAE_CITIES, compactPostal, formatPostal, isCountryCode, regionCodeFromName, regionName, timeZoneFor,
} from './countries';
import { cacheGet, cacheSet } from './cache';

function clean(value: string | null | undefined, max = 60): string | undefined {
  if (!value) return undefined;
  const v = value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
  return v || undefined;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function num(value: string | null | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export interface DetectedLocation {
  supported: boolean;
  /** Two-letter country the IP is in, even when we don't support it. */
  detectedCountry?: string;
  location: UserLocation;
}

/** Reads the visitor's approximate location from Vercel's geolocation headers. */
export function detectFromHeaders(headers: Headers): DetectedLocation {
  const country = headers.get('x-vercel-ip-country')?.toUpperCase();
  if (!country) {
    return { supported: true, location: { country: 'US', source: 'default' } };
  }
  if (!isCountryCode(country)) {
    return { supported: false, detectedCountry: country, location: { country: 'US', source: 'default' } };
  }
  const regionCode = clean(headers.get('x-vercel-ip-country-region'), 6)?.toUpperCase();
  const cityHeader = headers.get('x-vercel-ip-city');
  const rawPostal = clean(headers.get('x-vercel-ip-postal-code'), 10);
  const postal = rawPostal ? compactPostal(rawPostal) : undefined;
  const cfg = COUNTRIES[country];
  const location: UserLocation = {
    country,
    regionCode,
    region: regionName(country, regionCode),
    city: cityHeader ? clean(safeDecode(cityHeader)) : undefined,
    postalCode: postal && cfg.postal?.pattern.test(postal) ? postal : undefined,
    lat: num(headers.get('x-vercel-ip-latitude')),
    lng: num(headers.get('x-vercel-ip-longitude')),
    source: 'ip',
  };
  return { supported: true, detectedCountry: country, location };
}

/** Validates location fields sent by the browser as query parameters. */
export function locationFromParams(params: URLSearchParams): UserLocation {
  const upper = params.get('country')?.toUpperCase();
  const rawCountry = upper === 'UK' ? 'GB' : upper;
  const country: CountryCode = isCountryCode(rawCountry) ? rawCountry : 'US';
  const cfg = COUNTRIES[country];
  const typedPostal = clean(params.get('postal'), 10);
  const postal = typedPostal ? compactPostal(typedPostal) : undefined;
  const source = params.get('source');
  let regionCode = clean(params.get('regionCode'), 6)?.toUpperCase();
  const region = clean(params.get('region'));
  if (!regionCode && region) regionCode = regionCodeFromName(country, region);
  return {
    country,
    postalCode: postal && cfg.postal?.pattern.test(postal) ? postal : undefined,
    city: clean(params.get('city')),
    region: region ?? regionName(country, regionCode),
    regionCode: regionCode && /^[A-Z]{2,3}$/.test(regionCode) ? regionCode : undefined,
    lat: num(params.get('lat')),
    lng: num(params.get('lng')),
    source: source === 'ip' || source === 'gps' || source === 'manual' ? source : 'default',
  };
}

export function describeLocation(loc: UserLocation): string {
  const cfg = COUNTRIES[loc.country];
  if (loc.country === 'US') {
    const place = [loc.city, loc.regionCode ?? loc.region].filter(Boolean).join(', ');
    if (!place && loc.postalCode) return `ZIP ${loc.postalCode}`;
    return [place, loc.postalCode].filter(Boolean).join(' ') || cfg.name;
  }
  if (loc.country === 'IN') {
    const place = loc.city ?? loc.region;
    if (!place && loc.postalCode) return `PIN ${loc.postalCode}`;
    return [place, loc.postalCode].filter(Boolean).join(' ') || cfg.name;
  }
  if (loc.country === 'GB') {
    const place = loc.city ?? loc.region;
    const postcode = loc.postalCode ? formatPostal('GB', loc.postalCode) : undefined;
    if (!place && postcode) return `Postcode ${postcode}`;
    if (place && postcode) return `${place} ${postcode}`;
    return place ? `${place}, UK` : cfg.name;
  }
  const place = loc.city ?? loc.region;
  return place ? `${place}, UAE` : cfg.name;
}

/** Short key used in cache keys: results depend on where the shopper is. */
export function locationKey(loc: UserLocation): string {
  return (loc.postalCode ?? loc.city ?? loc.region ?? 'any').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

interface PostalInfo {
  city?: string;
  region?: string;
  regionCode?: string;
  lat?: number;
  lng?: number;
}

/** Fetches JSON. A 404 means the code doesn't exist and comes back as null; other errors throw. */
async function fetchJson(url: string, timeoutMs = 3500): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** A town for a UK postcode: "London" for every London borough, otherwise the council area. */
export function ukTown(region?: string | null, district?: string | null): string | undefined {
  if (region === 'London') return 'London';
  if (!district) return undefined;
  const town = district.replace(/^City of\s+/i, '').replace(/,\s*City of$/i, '').replace(/\s+City$/i, '').trim();
  return town || undefined;
}

/** Looks up a US ZIP, UK postcode or Indian PIN code. Results are cached for 30 days. */
export async function lookupPostal(country: CountryCode, postal: string): Promise<PostalInfo | null> {
  if (country === 'AE') return null;
  const key = `postal:v1:${country}:${postal}`;
  const cached = await cacheGet<PostalInfo | { none: true }>(key);
  if (cached) return 'none' in cached ? null : cached;

  let info: PostalInfo | null = null;
  try {
    if (country === 'US') {
      const data = (await fetchJson(`https://api.zippopotam.us/us/${postal}`)) as {
        places?: { 'place name'?: string; state?: string; 'state abbreviation'?: string; latitude?: string; longitude?: string }[];
      } | null;
      const p = data?.places?.[0];
      if (p) {
        info = {
          city: p['place name'],
          region: p.state,
          regionCode: p['state abbreviation'],
          lat: num(p.latitude),
          lng: num(p.longitude),
        };
      }
    } else if (country === 'GB') {
      // postcodes.io: free, no key, Ordnance Survey and ONS data.
      const data = (await fetchJson(`https://api.postcodes.io/postcodes/${encodeURIComponent(postal)}`)) as {
        result?: {
          country?: string | null;
          region?: string | null;
          admin_district?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        } | null;
      } | null;
      const r = data?.result;
      if (r) {
        const nation = r.country ?? undefined;
        info = {
          city: ukTown(r.region, r.admin_district),
          region: nation,
          regionCode: regionCodeFromName('GB', nation),
          lat: r.latitude ?? undefined,
          lng: r.longitude ?? undefined,
        };
      }
    } else {
      const data = (await fetchJson(`https://api.postalpincode.in/pincode/${postal}`)) as {
        Status?: string;
        PostOffice?: { District?: string; State?: string; Name?: string }[];
      }[];
      const office = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : undefined;
      if (office) {
        info = { city: office.District ?? office.Name, region: office.State, regionCode: regionCodeFromName('IN', office.State) };
      }
    }
  } catch (err) {
    console.warn(`[location] postal lookup failed for ${country} ${postal}:`, (err as Error).message);
    return null; // don't cache network failures
  }
  await cacheSet(key, info ?? { none: true }, 30 * 86400);
  return info;
}

/** Fills in missing city/state from the postal code and works out the time zone and label. */
export async function resolveLocation(loc: UserLocation, browserTz?: string): Promise<ResolvedLocation> {
  const out: UserLocation = { ...loc };
  if (out.postalCode && (!out.city || !out.regionCode)) {
    const info = await lookupPostal(out.country, out.postalCode);
    if (info) {
      out.city = out.city ?? info.city;
      out.region = out.region ?? info.region;
      out.regionCode = out.regionCode ?? info.regionCode;
      out.lat = out.lat ?? info.lat;
      out.lng = out.lng ?? info.lng;
    }
  }
  if (out.country === 'AE' && out.city && !out.region) {
    out.region = UAE_CITIES.find((c) => c.city.toLowerCase() === out.city?.toLowerCase())?.emirate;
  }
  if (!out.regionCode && out.region) out.regionCode = regionCodeFromName(out.country, out.region);
  if (!out.region && out.regionCode) out.region = regionName(out.country, out.regionCode);
  return {
    ...out,
    label: describeLocation(out),
    timeZone: timeZoneFor(out.country, out.regionCode, browserTz),
  };
}
