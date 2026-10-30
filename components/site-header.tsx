'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { loadWatchlist } from '@/lib/storage';
import { Flag } from './flags';
import { BookmarkIcon, ChevronDownIcon, PinIcon } from './icons';
import { useLocation } from './location-provider';
import { Logo } from './logo';
import { SearchBox } from './search-box';

function LocationButton() {
  const { location, ready, openPicker } = useLocation();
  return (
    <button
      type="button"
      onClick={openPicker}
      className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-ink ring-1 ring-line-strong hover:bg-canvas"
      aria-label={location ? `Delivering to ${location.label}. Change location` : 'Choose your location'}
    >
      {location ? <Flag country={location.country} /> : <PinIcon size={16} />}
      <span className="max-w-[9.5rem] truncate">{ready && location ? location.label : 'Locating…'}</span>
      <ChevronDownIcon size={16} className="shrink-0 text-muted" />
    </button>
  );
}

function WatchlistLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(loadWatchlist().length);
    update();
    window.addEventListener('stealz:watchlist', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('stealz:watchlist', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return (
    <Link
      href="/watchlist"
      className="relative inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink ring-1 ring-line-strong hover:bg-canvas"
      aria-label={`Watchlist${count ? `, ${count} saved` : ''}`}
    >
      <BookmarkIcon size={18} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-sticker px-1 text-[11px] font-bold text-sticker-ink">
          {count}
        </span>
      )}
    </Link>
  );
}

function HeaderSearch() {
  const params = useSearchParams();
  return <SearchBox initialQuery={params.get('q') ?? ''} />;
}

function UnsupportedNotice() {
  const { unsupportedCountry, openPicker } = useLocation();
  if (!unsupportedCountry) return null;
  return (
    <div className="border-b border-line bg-canvas">
      <p className="mx-auto max-w-6xl px-4 py-2 text-[13px] text-ink-soft sm:px-6">
        Stealz covers the US, the UAE and India for now, so you&apos;re seeing US prices.{' '}
        <button type="button" onClick={openPicker} className="font-semibold text-ink underline underline-offset-2">
          Choose a location
        </button>
      </p>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <UnsupportedNotice />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block">
          {!isHome && (
            <Suspense fallback={<div className="h-11" />}>
              <HeaderSearch />
            </Suspense>
          )}
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 md:ml-0">
          <LocationButton />
          <WatchlistLink />
        </div>
      </div>
      {!isHome && (
        <div className="px-4 pb-3 md:hidden">
          <Suspense fallback={<div className="h-11" />}>
            <HeaderSearch />
          </Suspense>
        </div>
      )}
    </header>
  );
}
