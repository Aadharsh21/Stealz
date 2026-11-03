'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { COUNTRIES, formatPostal } from '@/lib/countries';
import { loadWatchlist } from '@/lib/storage';
import { Flag } from './flags';
import { BookmarkIcon, ChevronDownIcon, PinIcon, TagIcon } from './icons';
import { useLocation } from './location-provider';
import { Logo } from './logo';
import { SearchBox } from './search-box';

const iconButton =
  "press relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink hover:bg-fill after:absolute after:-inset-0.5 after:content-['']";

function LocationButton() {
  const { location, ready, openPicker } = useLocation();
  return (
    <button
      type="button"
      onClick={openPicker}
      className="press relative inline-flex h-9 min-w-0 items-center gap-2 rounded-full bg-fill pl-2.5 pr-2 text-subhead font-semibold text-ink hover:bg-fill-strong after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
      aria-label={location ? `Delivering to ${location.label}. Change location` : 'Choose your location'}
    >
      {location ? <Flag country={location.country} /> : <PinIcon size={16} />}
      {ready && location ? (
        <>
          {/* Phones get the short form (a ZIP code or the country), so the full label never gets cut off. */}
          <span className="max-w-[6.5rem] truncate max-[359px]:hidden sm:hidden">
            {location.postalCode ? formatPostal(location.country, location.postalCode) : location.city ?? COUNTRIES[location.country].short}
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">{location.label}</span>
        </>
      ) : (
        <span>Locating…</span>
      )}
      <ChevronDownIcon size={14} className="shrink-0 text-muted" strokeWidth={2.4} />
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
    <Link href="/watchlist" className={iconButton} aria-label={`Watchlist${count ? `, ${count} saved` : ''}`}>
      <BookmarkIcon size={19} />
      {count > 0 && (
        <span className="tnum absolute right-0 top-0 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-sticker px-1 text-[0.6875rem] font-bold leading-none text-sticker-ink">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function DealsNav() {
  const pathname = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      aria-current={pathname === href ? 'page' : undefined}
      className={`press relative whitespace-nowrap rounded-full px-3 py-2 text-subhead font-medium transition-colors hover:text-ink ${
        pathname === href ? 'text-ink' : 'text-ink-soft'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <>
      <nav aria-label="Deals" className="hidden items-center lg:flex">
        {link('/sale', 'On sale')}
        {link('/coupons', 'Coupons')}
      </nav>
      <Link href="/sale" aria-label="On sale" className={`${iconButton} text-markdown lg:hidden`}>
        <TagIcon size={19} />
      </Link>
    </>
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
    <div className="bg-canvas">
      <p className="mx-auto max-w-6xl px-4 py-2 text-footnote text-ink-soft sm:px-6">
        Stealz covers the US, the UK, the UAE and India for now, so you&apos;re seeing US prices.{' '}
        <button type="button" onClick={openPicker} className="font-semibold text-ink underline underline-offset-2">
          Choose a location
        </button>
      </p>
    </div>
  );
}

/** Scroll edge effect: the header turns into a material only once content is under it. */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 2);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return scrolled;
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const scrolled = useScrolled();
  return (
    <header
      data-scrolled={scrolled}
      className="site-header sticky top-0 z-40 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <UnsupportedNotice />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block">
          {!isHome && (
            <Suspense fallback={<div className="h-10" />}>
              <HeaderSearch />
            </Suspense>
          )}
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 md:ml-0 lg:gap-2">
          <DealsNav />
          <LocationButton />
          <WatchlistLink />
        </div>
      </div>
      {!isHome && (
        <div className="px-4 pb-3 md:hidden">
          <Suspense fallback={<div className="h-10" />}>
            <HeaderSearch />
          </Suspense>
        </div>
      )}
    </header>
  );
}
