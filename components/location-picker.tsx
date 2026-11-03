'use client';

import { useEffect, useState } from 'react';
import type { CountryCode, ResolvedLocation } from '@/lib/types';
import { COUNTRIES, COUNTRY_CODES, UAE_CITIES, compactPostal, formatPostal, isCountryCode } from '@/lib/countries';
import { browserTimeZone, getJson, ApiClientError } from '@/lib/client';
import { Flag } from './flags';
import { LocateIcon, SpinnerIcon, XIcon } from './icons';
import { useLocation } from './location-provider';
import { Sheet } from './sheet';
import { Segmented, buttonClass } from './ui';

interface ResolveResult {
  valid: boolean;
  location?: ResolvedLocation;
  error?: string;
}

async function resolve(params: Record<string, string | undefined>): Promise<ResolvedLocation> {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const tz = browserTimeZone();
  if (tz) p.set('tz', tz);
  const res = await fetch(`/api/location?${p}`);
  const body = (await res.json().catch(() => null)) as ResolveResult | null;
  if (!res.ok || !body?.valid || !body.location) throw new Error(body?.error ?? "We couldn't use that location.");
  return body.location;
}

interface ReverseGeocode {
  countryCode?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  city?: string;
  locality?: string;
  postcode?: string;
}

export function LocationPicker() {
  const { location, setLocation, pickerOpen, closePicker } = useLocation();
  const [country, setCountry] = useState<CountryCode>('US');
  const [postal, setPostal] = useState('');
  const [city, setCity] = useState('Dubai');
  const [busy, setBusy] = useState<'save' | 'gps' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Each time the sheet opens, start from the saved location.
  useEffect(() => {
    if (!pickerOpen) return;
    setCountry(location?.country ?? 'US');
    setPostal(location?.postalCode ? formatPostal(location.country, location.postalCode) : '');
    setCity(location?.country === 'AE' && location.city ? location.city : 'Dubai');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  const cfg = COUNTRIES[country];

  function pickCountry(c: CountryCode) {
    setCountry(c);
    // Keep the saved code when switching back to its country; a ZIP code means nothing in the UK.
    setPostal(location?.country === c && location.postalCode ? formatPostal(c, location.postalCode) : '');
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const typed = compactPostal(postal);
    if (cfg.postal && !cfg.postal.pattern.test(typed)) {
      setError(cfg.postal.invalid);
      return;
    }
    setBusy('save');
    try {
      const resolved = await resolve(
        country === 'AE'
          ? { country, city, source: 'manual' }
          : { country, postal: typed, source: 'manual' },
      );
      setLocation(resolved);
      closePicker();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function locateMe() {
    setError(null);
    if (!('geolocation' in navigator)) {
      setError("This browser can't share your location. Enter it instead.");
      return;
    }
    setBusy('gps');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geo = await getJson<ReverseGeocode>(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const code = geo.countryCode?.toUpperCase();
          if (!isCountryCode(code)) {
            setError('Stealz covers the US, the UK, the UAE and India right now. Pick one of those to see prices.');
            return;
          }
          // Only a complete code is sent; a partial one (like "SW1A") would be rejected.
          const postcode = geo.postcode ? compactPostal(geo.postcode) : undefined;
          const resolved = await resolve({
            country: code,
            postal: postcode && COUNTRIES[code].postal?.pattern.test(postcode) ? postcode : undefined,
            city: geo.city || geo.locality,
            region: geo.principalSubdivision,
            regionCode: geo.principalSubdivisionCode?.split('-')[1],
            source: 'gps',
          });
          setLocation(resolved);
          closePicker();
        } catch (err) {
          setError(err instanceof ApiClientError || err instanceof Error ? err.message : "We couldn't find your location. Enter it instead.");
        } finally {
          setBusy(null);
        }
      },
      () => {
        setBusy(null);
        setError(`Location access is off. Enter your ${cfg.postal?.noun ?? 'city'} instead.`);
      },
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <Sheet open={pickerOpen} onClose={closePicker} labelledBy="location-title">
      <form onSubmit={save} className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6 sm:pt-6">
        <div data-sheet-handle className="flex items-start justify-between gap-4">
          <div>
            <h2 id="location-title" className="text-title3">
              Where are you shopping from?
            </h2>
            <p className="mt-1.5 text-subhead text-muted">Shipping, tax and delivery dates depend on where the order goes.</p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            className="press grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fill text-ink-soft hover:bg-fill-strong"
            aria-label="Close"
          >
            <XIcon size={15} strokeWidth={2.4} />
          </button>
        </div>

        <Segmented
          label="Country"
          className="mt-5"
          pad="px-1.5 sm:px-3"
          value={country}
          onChange={pickCountry}
          options={COUNTRY_CODES.map((c) => ({
            value: c,
            label: (
              <>
                <Flag country={c} />
                <span className="truncate">{COUNTRIES[c].short}</span>
              </>
            ),
          }))}
        />

        <div className="mt-5">
          {cfg.postal ? (
            <label className="block">
              <span className="text-footnote font-semibold text-ink-soft">{cfg.postal.label}</span>
              <span className="field mt-1.5 h-12">
                <input
                  value={postal}
                  onChange={(e) =>
                    setPostal(
                      cfg.postal?.numeric
                        ? e.target.value.replace(/[^\d]/g, '').slice(0, cfg.postal.length)
                        : e.target.value.toUpperCase().replace(/[^A-Z\d ]/g, '').replace(/\s{2,}/g, ' ').slice(0, cfg.postal?.length ?? 8),
                    )
                  }
                  inputMode={cfg.postal.numeric ? 'numeric' : 'text'}
                  autoCapitalize={cfg.postal.numeric ? undefined : 'characters'}
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  autoComplete="postal-code"
                  placeholder={cfg.postal.placeholder}
                />
              </span>
            </label>
          ) : (
            <label className="block">
              <span className="text-footnote font-semibold text-ink-soft">City</span>
              <span className="field mt-1.5 h-12 pr-2">
                <select value={city} onChange={(e) => setCity(e.target.value)} className="cursor-pointer">
                  {UAE_CITIES.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={locateMe}
          disabled={busy !== null}
          className="press mt-3 inline-flex items-center gap-2 rounded-full py-2 pr-2 text-subhead font-semibold text-accent-ink hover:underline disabled:opacity-60"
        >
          {busy === 'gps' ? <SpinnerIcon size={16} /> : <LocateIcon size={16} />}
          Use my current location
        </button>

        {error && (
          <p className="mt-3 text-subhead text-critical" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={closePicker} className={buttonClass('secondary')}>
            Cancel
          </button>
          <button type="submit" disabled={busy !== null} aria-busy={busy === 'save'} className={buttonClass('primary')}>
            {busy === 'save' && <SpinnerIcon size={16} />}
            Save location
          </button>
        </div>
      </form>
    </Sheet>
  );
}
