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
import { DiscountTag, ProductImage } from './product-card';
import { Skeleton, buttonClass, chipClass } from './ui';

function PickCard({ pick, index }: { pick: PickItem; index: number }) {
  const pct = discountPercent(pick.price, pick.originalPrice);
  return (
    <Link
      href={productHref(pick.ref)}
      className="press-soft rise-in group w-[44vw] max-w-[236px] shrink-0 snap-start sm:w-[236px]"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="relative">
        <ProductImage src={pick.image} alt={pick.title} className="aspect-[4/5]" zoom />
        {pct != null && <DiscountTag className="absolute left-2.5 top-2.5">{pct}% off</DiscountTag>}
      </div>
      <p className="mt-3 truncate text-footnote text-muted">{pick.brand ?? ' '}</p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.8em] text-subhead font-semibold">{pick.title}</h3>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-footnote text-muted">from</span>
        <span className="price text-[1.25rem] leading-none">{formatMoney(pick.price, pick.currency)}</span>
      </p>
      <p className="mt-1 truncate text-footnote text-muted">
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
          <Skeleton className="aspect-[4/5] w-full rounded-tile" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-40 max-w-full" />
          <Skeleton className="mt-3 h-5 w-24" />
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
  const arrow =
    'press grid h-9 w-9 place-items-center rounded-full bg-fill text-ink hover:bg-fill-strong disabled:opacity-40';

  return (
    <section aria-labelledby="picks-heading" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="picks-heading" className="text-title2">
            Worth a look this week
          </h2>
          <p className="mt-1.5 text-subhead text-muted">
            Real prices from stores in {COUNTRIES[country].inPhrase}. Tap one to compare every store.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll picks left" className={arrow} disabled={items.length === 0}>
            <ChevronLeftIcon size={18} strokeWidth={2.2} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll picks right" className={arrow} disabled={items.length === 0}>
            <ChevronRightIcon size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Categories" className="shelf -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:px-0">
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
              className={chipClass(selected)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id="picks-panel" role="tabpanel" aria-labelledby={`picks-tab-${tab}`} className="mt-6">
        {data === undefined && <PicksSkeleton />}

        {(data === 'error' || (data && items.length === 0)) && (
          <div className="rounded-card bg-canvas p-6">
            <p className="text-callout text-ink-soft">Picks for this category are being refreshed. Search it directly instead:</p>
            <Link href={`/search?q=${encodeURIComponent(current.query)}`} className={`${buttonClass('primary', 'sm')} mt-4`}>
              Search {current.label.toLowerCase()}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div
              key={key}
              ref={scroller}
              className="shelf -mx-4 flex scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none sm:mx-0 sm:scroll-px-0 sm:px-0"
            >
              {items.map((p, i) => (
                <PickCard key={p.ref} pick={p} index={i} />
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(current.query)}`}
                className="press-soft rise-in grid w-[44vw] max-w-[236px] shrink-0 snap-start place-items-center rounded-tile bg-canvas text-center sm:w-[236px]"
                style={{ '--i': items.length } as React.CSSProperties}
              >
                <span className="px-6">
                  <span className="block text-title3">See all {current.label.toLowerCase()}</span>
                  <span className="mt-2 inline-flex items-center gap-0.5 text-footnote font-semibold text-accent-ink">
                    Every store, compared <ChevronRightIcon size={14} strokeWidth={2.4} />
                  </span>
                </span>
              </Link>
            </div>
            {data && data !== 'error' && data.checkedAt && (
              <p className="mt-3 text-footnote text-muted">
                Prices checked {timeAgo(data.checkedAt)}. Each item shows today&apos;s totals with tax and delivery.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
