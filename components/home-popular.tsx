'use client';

import Link from 'next/link';
import { popularSearches } from '@/lib/suggestions';
import { useLocation } from './location-provider';

export function HomePopular() {
  const { location } = useLocation();
  const items = popularSearches(location?.country ?? 'US').slice(0, 5);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[14px] text-muted">Try</span>
      {items.map((q) => (
        <Link
          key={q}
          href={`/search?q=${encodeURIComponent(q)}`}
          className="rounded-full bg-canvas px-3 py-1.5 text-[14px] font-medium text-ink-soft ring-1 ring-line hover:bg-paper hover:text-ink"
        >
          {q}
        </Link>
      ))}
    </div>
  );
}

export function HomeLocationLine() {
  const { location, ready, openPicker } = useLocation();
  return (
    <p className="mt-6 text-[14px] text-muted">
      {ready && location ? (
        <>
          Showing prices for <span className="font-semibold text-ink">{location.label}</span>.{' '}
          <button type="button" onClick={openPicker} className="font-semibold text-ink underline underline-offset-2">
            Change
          </button>
        </>
      ) : (
        'Finding your location…'
      )}
    </p>
  );
}
