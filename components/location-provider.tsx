'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ResolvedLocation } from '@/lib/types';
import { browserTimeZone, getJson } from '@/lib/client';
import { loadLocation, saveLocation } from '@/lib/storage';
import { LocationPicker } from './location-picker';

interface LocationContextValue {
  location: ResolvedLocation | null;
  ready: boolean;
  /** Set when the visitor's IP is in a country we don't cover yet. */
  unsupportedCountry?: string;
  setLocation: (loc: ResolvedLocation) => void;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

const FALLBACK: ResolvedLocation = {
  country: 'US',
  source: 'default',
  label: 'United States',
  timeZone: 'America/New_York',
};

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLoc] = useState<ResolvedLocation | null>(null);
  const [ready, setReady] = useState(false);
  const [unsupportedCountry, setUnsupported] = useState<string | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const saved = loadLocation();
    if (saved) {
      setLoc(saved);
      setReady(true);
      return;
    }
    const controller = new AbortController();
    const tz = browserTimeZone();
    getJson<{ supported: boolean; detectedCountry?: string; location: ResolvedLocation }>(
      `/api/location${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`,
      controller.signal,
    )
      .then((r) => {
        setLoc(r.location);
        if (!r.supported) setUnsupported(r.detectedCountry);
        if (r.location.source === 'ip') saveLocation(r.location);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setLoc(FALLBACK);
      })
      .finally(() => setReady(true));
    return () => controller.abort();
  }, []);

  const setLocation = useCallback((loc: ResolvedLocation) => {
    setLoc(loc);
    setUnsupported(undefined);
    saveLocation(loc);
  }, []);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      ready,
      unsupportedCountry,
      setLocation,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
    }),
    [location, ready, unsupportedCountry, setLocation, pickerOpen],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
      <LocationPicker />
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider');
  return ctx;
}
