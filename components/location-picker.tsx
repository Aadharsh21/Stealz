'use client';

import { useEffect, useRef, useState } from 'react';
import type { CountryCode, ResolvedLocation } from '@/lib/types';
import { COUNTRIES, COUNTRY_CODES, UAE_CITIES } from '@/lib/countries';
import { browserTimeZone, getJson, ApiClientError } from '@/lib/client';
import { Flag } from './flags';
import { LocateIcon, SpinnerIcon, XIcon } from './icons';
import { useLocation } from './location-provider';
import { buttonClass } from './ui';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [country, setCountry] = useState<CountryCode>('US');
  const [postal, setPostal] = useState('');
  const [city, setCity] = useState('Dubai');
  const [busy, setBusy] = useState<'save' | 'gps' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pickerOpen && !dialog.open) {
      setCountry(location?.country ?? 'US');
      setPostal(location?.postalCode ?? '');
      setCity(location?.country === 'AE' && location.city ? location.city : 'Dubai');
      setError(null);
      dialog.showModal();
    } else if (!pickerOpen && dialog.open) {
      dialog.close();
    }
  }, [pickerOpen, location]);

  const cfg = COUNTRIES[country];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cfg.postal && !cfg.postal.pattern.test(postal.trim())) {
      setError(`Enter a ${cfg.postal.length}-digit ${cfg.postal.label}.`);
      return;
    }
    setBusy('save');
    try {
      const resolved = await resolve(
        country === 'AE'
          ? { country, city, source: 'manual' }
          : { country, postal: postal.trim(), source: 'manual' },
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
          if (code !== 'US' && code !== 'AE' && code !== 'IN') {
            setError('Stealz covers the US, the UAE and India right now. Pick one of those to see prices.');
            return;
          }
          const resolved = await resolve({
            country: code,
            postal: geo.postcode?.replace(/\s+/g, ''),
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
        setError(`Location access is off. Enter your ${cfg.postal?.label ?? 'city'} instead.`);
      },
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={closePicker}
      onClick={(e) => {
        if (e.target === dialogRef.current) closePicker();
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl bg-paper p-0 text-ink shadow-2xl ring-1 ring-line backdrop:bg-[#0e1124]/50"
      aria-labelledby="location-title"
    >
      <form onSubmit={save} className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="location-title" className="type-wide text-[20px] font-extrabold tracking-[-0.02em]">
              Where are you shopping from?
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Shipping, tax and delivery dates depend on where the order goes.
            </p>
          </div>
          <button type="button" onClick={closePicker} className={buttonClass('ghost', 'sm')} aria-label="Close">
            <XIcon />
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="sr-only">Country</legend>
          <div className="grid grid-cols-3 gap-2">
            {COUNTRY_CODES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCountry(c);
                  setError(null);
                }}
                aria-pressed={country === c}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold ring-1 transition-colors ${
                  country === c ? 'bg-ink text-paper ring-ink' : 'bg-paper text-ink ring-line-strong hover:bg-canvas'
                }`}
              >
                <Flag country={c} />
                {COUNTRIES[c].short}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          {cfg.postal ? (
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-soft">{cfg.postal.label}</span>
              <input
                value={postal}
                onChange={(e) => setPostal(e.target.value.replace(/[^\d]/g, '').slice(0, cfg.postal?.length ?? 6))}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder={cfg.postal.placeholder}
                className="mt-1.5 h-12 w-full rounded-xl bg-paper px-4 text-[16px] ring-1 ring-line-strong placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-soft">City</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl bg-paper px-3 text-[16px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-focus"
              >
                {UAE_CITIES.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={locateMe}
          disabled={busy !== null}
          className="mt-3 inline-flex items-center gap-2 rounded-lg text-[14px] font-semibold text-series hover:underline disabled:opacity-60"
        >
          {busy === 'gps' ? <SpinnerIcon size={16} /> : <LocateIcon size={16} />}
          Use my current location
        </button>

        {error && (
          <p className="mt-4 text-[14px] leading-relaxed text-critical" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" onClick={closePicker} className={buttonClass('secondary')}>
            Cancel
          </button>
          <button type="submit" disabled={busy !== null} className={buttonClass('primary')}>
            {busy === 'save' && <SpinnerIcon size={16} />}
            Save location
          </button>
        </div>
      </form>
    </dialog>
  );
}
