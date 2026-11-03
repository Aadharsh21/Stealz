'use client';

import Link from 'next/link';
import { popularSearches } from '@/lib/suggestions';
import { useLocation } from './location-provider';

export function HomePopular({ center = false }: { center?: boolean }) {
  const { location } = useLocation();
  const items = popularSearches(location?.country ?? 'US').slice(0, 5);
  return (
    <div
      className={`shelf -mx-4 mt-5 flex items-center gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 ${
        center ? 'sm:justify-center' : ''
      }`}
    >
      <span className="mr-1 shrink-0 text-footnote text-muted">Try</span>
      {items.map((q) => (
        <Link
          key={q}
          href={`/search?q=${encodeURIComponent(q)}`}
          className="press relative inline-flex h-8 shrink-0 items-center rounded-full bg-fill px-3.5 text-footnote font-medium text-ink-soft hover:bg-fill-strong hover:text-ink after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"
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
    <p className="mt-6 text-footnote text-muted">
      {ready && location ? (
        <>
          Showing prices for <span className="font-semibold text-ink-soft">{location.label}</span>.{' '}
          <button type="button" onClick={openPicker} className="press rounded-full px-1 font-semibold text-accent-ink hover:underline">
            Change
          </button>
        </>
      ) : (
        'Finding your location…'
      )}
    </p>
  );
}
