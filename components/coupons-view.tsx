'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CouponRow, CouponsResponse } from '@/lib/coupon-codes';
import { COUNTRIES } from '@/lib/countries';
import { getJson, timeAgo } from '@/lib/client';
import { productHref } from '@/lib/ref';
import { SALE_TABS } from '@/lib/sale-tabs';
import { STORE_SITES } from '@/lib/store-links';
import { CheckIcon, ExternalIcon, TagIcon } from './icons';
import { useLocation } from './location-provider';
import { Skeleton, buttonClass } from './ui';

function CouponCard({ coupon: c }: { coupon: CouponRow }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const foundOn = c.productRef ? productHref(c.productRef) : c.productTitle ? `/search?q=${encodeURIComponent(c.productTitle)}` : null;
  return (
    <li className="flex min-w-0 flex-col rounded-card bg-canvas p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-headline">{c.store}</p>
        <p className="shrink-0 text-caption text-muted">Seen {timeAgo(c.lastSeen)}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="max-w-full break-all rounded-xl bg-sticker/20 px-3 py-1.5 font-mono text-callout font-semibold tracking-[0.06em] text-accent-ink">
          {c.code}
        </span>
        <button type="button" onClick={copy} className={buttonClass(copied ? 'tinted' : 'secondary', 'sm')} aria-live="polite">
          {copied ? (
            <>
              <CheckIcon size={15} strokeWidth={2.4} /> Copied
            </>
          ) : (
            'Copy code'
          )}
        </button>
      </div>
      {c.detail && <p className="mt-3 break-words text-subhead text-ink-soft">{c.detail}</p>}
      {foundOn && c.productTitle && (
        <p className="mt-2 break-words text-footnote text-muted">
          Listed with{' '}
          <Link href={foundOn} className="text-ink-soft underline underline-offset-2 hover:text-ink">
            {c.productTitle}
          </Link>
        </p>
      )}
      {c.link && (
        <a
          href={c.link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="press mt-auto inline-flex items-center gap-1.5 self-start rounded-full pt-4 text-subhead font-semibold text-accent-ink hover:underline"
        >
          Shop at {c.store} <ExternalIcon size={14} />
        </a>
      )}
    </li>
  );
}

/** Promo codes stores publish, stores with sales on, and more stores to try. */
export function CouponsView() {
  const { location, ready } = useLocation();
  const country = location?.country ?? 'US';
  const name = COUNTRIES[country].inPhrase;
  const [results, setResults] = useState<Record<string, CouponsResponse | 'error'>>({});
  const data = results[country];

  useEffect(() => {
    if (!ready || results[country]) return;
    let cancelled = false;
    getJson<CouponsResponse>(`/api/coupons?country=${country}`)
      .then((d) => !cancelled && setResults((r) => ({ ...r, [country]: d })))
      .catch(() => !cancelled && setResults((r) => ({ ...r, [country]: 'error' })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, ready]);

  const codes = data && data !== 'error' ? data.codes : [];
  const stores = data && data !== 'error' ? data.stores : [];
  const tabNoun = (id: string) => SALE_TABS.find((t) => t.id === id)?.noun ?? '';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <header className="max-w-3xl">
        <h1 className="text-title1">Coupons and offers</h1>
        <p className="mt-4 max-w-[54ch] text-intro text-ink-soft">
          Promo codes and sales from stores in {name}. Codes come from the stores&apos; own Google Shopping listings, so
          they&apos;re real, but stores can end them without notice.
        </p>
      </header>

      <section aria-labelledby="codes-heading" className="mt-12">
        <h2 id="codes-heading" className="text-title2">
          Promo codes
        </h2>
        {data === undefined && (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[176px] rounded-card" />
            ))}
          </div>
        )}
        {data !== undefined && codes.length === 0 && (
          <div className="mt-5 max-w-2xl rounded-card bg-canvas p-6">
            <p className="text-callout text-ink-soft">
              {data === 'error'
                ? "Codes couldn't be loaded right now. Try again in a minute."
                : `No codes spotted in ${name} in the last 30 days. When a store adds a code to an item's listing, it shows up here as soon as anyone views that item on Stealz.`}
            </p>
            <Link href="/sale" className={`${buttonClass('primary', 'sm')} mt-4`}>
              Browse items on sale
            </Link>
          </div>
        )}
        {codes.length > 0 && (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {codes.map((c) => (
              <CouponCard key={`${c.store}|${c.code}`} coupon={c} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sales-heading" className="mt-16">
        <h2 id="sales-heading" className="text-title2">
          Stores with sales on
        </h2>
        <p className="mt-1.5 text-subhead text-muted">From this week&apos;s markdowns on the On sale page.</p>
        {data !== undefined && stores.length === 0 && (
          <div className="mt-5 max-w-2xl rounded-card bg-canvas p-6">
            <p className="text-callout text-ink-soft">This fills in once this week&apos;s sales for {name} have been checked.</p>
            <Link href="/sale" className={`${buttonClass('primary', 'sm')} mt-4`}>
              Check what&apos;s on sale
            </Link>
          </div>
        )}
        {stores.length > 0 && (
          <ul className="divide-hairline mt-5 overflow-hidden rounded-card bg-canvas">
            {stores.map((s) => (
              <li key={s.store} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-headline">{s.store}</p>
                  <p className="text-footnote text-muted">
                    {s.items} {s.items === 1 ? 'item' : 'items'} on sale {s.tabs > 1 ? 'across categories, mostly' : 'in'} {tabNoun(s.tab)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {s.maxPct != null && (
                    <span className="flex items-center gap-1.5 text-subhead font-semibold text-markdown">
                      <TagIcon size={16} /> Up to {s.maxPct}% off
                    </span>
                  )}
                  <Link href={`/sale?tab=${s.tab}&store=${encodeURIComponent(s.store)}`} className={buttonClass('secondary', 'sm')}>
                    See items
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="directory-heading" className="mt-16">
        <h2 id="directory-heading" className="text-title2">
          More stores in {name}
        </h2>
        <p className="mt-1.5 max-w-[60ch] text-subhead text-muted">
          Prices on Stealz come from Google Shopping. These stores are worth checking too, and every search links to them.
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STORE_SITES[country].map((s) => (
            <li key={s.name}>
              <a
                href={s.home}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="press-soft flex h-full items-start justify-between gap-3 rounded-tile bg-canvas p-4 hover:bg-smoke/70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-headline">{s.name}</span>
                  <span className="block text-footnote text-muted">{s.blurb}</span>
                </span>
                <ExternalIcon size={15} className="mt-1 shrink-0 text-muted" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
