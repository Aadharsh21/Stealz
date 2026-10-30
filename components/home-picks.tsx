'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { COUNTRIES } from '@/lib/countries';
import { getJson, timeAgo } from '@/lib/client';
import { formatMoney } from '@/lib/money';
import { discountPercent } from '@/lib/offer';
import { PICK_TABS } from '@/lib/pick-tabs';
import type { PickItem, PickTab, PicksResponse } from '@/lib/pick-tabs';
import { productHref } from '@/lib/ref';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { useLocation } from './location-provider';
import { ProductImage } from './product-card';
import { Badge, Skeleton } from './ui';

function PickCard({ pick, index }: { pick: PickItem; index: number }) {
  const pct = discountPercent(pick.price, pick.originalPrice);
  return (
    <Link
      href={productHref(pick.ref)}
      className="pick-in group w-[44vw] max-w-[236px] shrink-0 snap-start sm:w-[236px]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative">
        <ProductImage
          src={pick.image}
          alt={pick.title}
          className="aspect-[4/5] [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.05]"
        />
        {pct != null && (
          <span className="absolute left-2.5 top-2.5">
            <Badge tone="sale" className="bg-paper/90 backdrop-blur">
              {pct}% off
            </Badge>
          </span>
        )}
      </div>
      <p className="mt-3 truncate text-[13px] text-muted">{pick.brand ?? pick.store}</p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
        {pick.title}
      </h3>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[12px] text-muted">from</span>
        <span className="type-cond text-[24px] leading-none">{formatMoney(pick.price, pick.currency)}</span>
      </p>
      <p className="mt-1 truncate text-[13px] text-muted">
        at {pick.store}
        {pick.storeCount > 1 && ` and ${pick.storeCount - 1} more`}
      </p>
    </Link>
  );
}

function PicksSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-[44vw] max-w-[236px] shrink-0 sm:w-[236px]">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-40" />
          <Skeleton className="mt-3 h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/** "Worth a look": real products per category, so the home page has something to tap. */
export function HomePicks() {
  const { location, ready } = useLocation();
  const country = location?.country ?? 'US';
  const [tab, setTab] = useState<PickTab>('women');
  const [results, setResults] = useState<Record<string, PicksResponse | 'error'>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const key = `${country}:${tab}`;
  const data = results[key];
  const current = PICK_TABS.find((t) => t.id === tab) ?? PICK_TABS[0];

  useEffect(() => {
    if (!ready || results[key]) return;
    let cancelled = false;
    getJson<PicksResponse>(`/api/picks?tab=${tab}&country=${country}`)
      .then((d) => !cancelled && setResults((r) => ({ ...r, [key]: d })))
      .catch(() => !cancelled && setResults((r) => ({ ...r, [key]: 'error' })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const items = data && data !== 'error' ? data.items : [];

  return (
    <section aria-labelledby="picks-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="picks-heading" className="type-wide text-[34px] leading-tight sm:text-[42px]">
            Worth a look this week
          </h2>
          <p className="mt-1 text-[15px] text-muted">
            Real prices from stores in {COUNTRIES[country].name}. Tap one to compare every store.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll picks left"
            className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-line-strong hover:bg-canvas"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll picks right"
            className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-line-strong hover:bg-canvas"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Categories" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        {PICK_TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`picks-tab-${t.id}`}
              aria-selected={selected}
              aria-controls="picks-panel"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                selected ? 'bg-ink text-paper' : 'text-ink-soft ring-1 ring-line-strong hover:bg-canvas hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id="picks-panel" role="tabpanel" aria-labelledby={`picks-tab-${tab}`} className="mt-6">
        {data === undefined && <PicksSkeleton />}

        {(data === 'error' || (data && items.length === 0)) && (
          <div className="rounded-2xl bg-canvas p-6 ring-1 ring-line">
            <p className="text-[15px] text-ink-soft">Picks for this category are being refreshed. Search it directly instead:</p>
            <Link
              href={`/search?q=${encodeURIComponent(current.query)}`}
              className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-paper hover:bg-ink-soft"
            >
              Search {current.label.toLowerCase()}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div
              key={key}
              ref={scroller}
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-none sm:mx-0 sm:scroll-px-0 sm:px-0"
            >
              {items.map((p, i) => (
                <PickCard key={p.ref} pick={p} index={i} />
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(current.query)}`}
                className="pick-in grid w-[44vw] max-w-[236px] shrink-0 snap-start place-items-center rounded-xl text-center ring-1 ring-line hover:bg-canvas sm:w-[236px]"
                style={{ animationDelay: `${items.length * 50}ms` }}
              >
                <span className="px-6">
                  <span className="type-wide block text-[24px] leading-tight">See all {current.label.toLowerCase()}</span>
                  <span className="mt-2 block text-[13px] text-muted">Every store, compared</span>
                </span>
              </Link>
            </div>
            {data && data !== 'error' && data.checkedAt && (
              <p className="mt-3 text-[12px] text-muted">
                Prices checked {timeAgo(data.checkedAt)}. Each item shows today&apos;s totals with tax and delivery.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
