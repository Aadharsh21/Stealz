'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { COUNTRIES } from '@/lib/countries';
import { getJson, timeAgo } from '@/lib/client';
import { formatMoney } from '@/lib/money';
import { productHref } from '@/lib/ref';
import { SALE_TABS, isSaleTab } from '@/lib/sale-tabs';
import type { SaleItem, SaleResponse, SaleTab } from '@/lib/sale-tabs';
import { TicketIcon, XIcon } from './icons';
import { useLocation } from './location-provider';
import { ProductImage } from './product-card';
import { Skeleton, WasPrice } from './ui';

type SortKey = 'discount' | 'price';

function SaleCard({ item, index }: { item: SaleItem; index: number }) {
  return (
    <Link href={productHref(item.ref)} className="pick-in group block" style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }}>
      <div className="relative">
        <ProductImage
          src={item.image}
          alt={item.title}
          className="aspect-[4/5] [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04]"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[13px] font-bold text-markdown ring-1 ring-markdown/50 backdrop-blur">
          {item.pct != null ? `${item.pct}% off` : 'On sale'}
        </span>
      </div>
      <p className="mt-3 truncate text-[13px] text-muted">{item.brand ?? ' '}</p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
        {item.title}
      </h3>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="type-cond text-[24px] leading-none">{formatMoney(item.price, item.currency)}</span>
        {item.originalPrice != null && <WasPrice amount={item.originalPrice} currency={item.currency} className="text-[14px]" />}
      </p>
      <p className="mt-1 truncate text-[13px] text-muted">
        at {item.store}
        {item.storeCount > 1 && ` and ${item.storeCount - 1} more`}
      </p>
    </Link>
  );
}

function SaleSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-3 h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/** "On sale": real markdowns per category, from Google Shopping's on-sale filter. */
export function SaleView() {
  const params = useSearchParams();
  const router = useRouter();
  const { location, ready } = useLocation();
  const country = location?.country ?? 'US';
  const fromUrl = params.get('tab');
  const tab: SaleTab = isSaleTab(fromUrl) ? fromUrl : 'women';
  const store = params.get('store')?.trim() ?? '';
  const [sort, setSort] = useState<SortKey>('discount');
  const [results, setResults] = useState<Record<string, SaleResponse | 'error'>>({});
  const key = `${country}:${tab}`;
  const data = results[key];
  const current = SALE_TABS.find((t) => t.id === tab) ?? SALE_TABS[0];

  useEffect(() => {
    if (!ready || results[key]) return;
    let cancelled = false;
    getJson<SaleResponse>(`/api/sale?tab=${tab}&country=${country}`)
      .then((d) => !cancelled && setResults((r) => ({ ...r, [key]: d })))
      .catch(() => !cancelled && setResults((r) => ({ ...r, [key]: 'error' })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  useEffect(() => {
    document.title = `${current.label} on sale | Stealz`;
  }, [current.label]);

  const go = (next: { tab?: SaleTab; store?: string | null }) => {
    const p = new URLSearchParams();
    p.set('tab', next.tab ?? tab);
    const s = next.store === undefined ? store : next.store;
    if (s) p.set('store', s);
    router.replace(`/sale?${p}`, { scroll: false });
  };

  const items = useMemo(() => {
    if (!data || data === 'error') return [];
    const list = store ? data.items.filter((i) => i.store.toLowerCase() === store.toLowerCase()) : data.items;
    return sort === 'price' ? [...list].sort((a, b) => a.price - b.price) : list;
  }, [data, store, sort]);

  const loaded = data !== undefined;
  const empty = loaded && items.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <header className="max-w-3xl">
        <h1 className="type-wide type-hero text-[52px] leading-[0.95] sm:text-[72px]">On sale</h1>
        <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink-soft">
          Markdowns from stores that deliver to {COUNTRIES[country].inPhrase}. Fake shops, used items and inflated &ldquo;was&rdquo;
          prices are left out, and each item opens a full comparison with delivery and tax.
        </p>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label="Categories" className="-mx-4 flex max-w-full gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
          {SALE_TABS.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`sale-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="sale-panel"
                onClick={() => go({ tab: t.id, store: null })}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                  selected ? 'bg-ink text-paper' : 'text-ink-soft ring-1 ring-line-strong hover:bg-canvas hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <span className="text-muted">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-full bg-paper px-3 text-[13px] font-semibold ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <option value="discount">Biggest discount</option>
            <option value="price">Lowest price</option>
          </select>
        </label>
      </div>

      {store && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => go({ store: null })}
            className="inline-flex items-center gap-2 rounded-full bg-canvas px-3.5 py-1.5 text-[14px] font-semibold ring-1 ring-line-strong hover:bg-paper"
          >
            Only {store}
            <XIcon size={14} />
            <span className="sr-only">Show every store</span>
          </button>
        </div>
      )}

      <div id="sale-panel" role="tabpanel" aria-labelledby={`sale-tab-${tab}`} className="mt-8">
        {!loaded && <SaleSkeleton />}

        {empty && (
          <div className="max-w-xl rounded-2xl bg-canvas p-6 ring-1 ring-line">
            <p className="text-[15px] text-ink-soft">
              {data === 'error'
                ? "Sales for this category couldn't be loaded right now."
                : store
                  ? `${store} has nothing on sale in ${current.label.toLowerCase()} right now.`
                  : `No markdowns found in ${current.label.toLowerCase()} this week.`}{' '}
              Search it directly to compare every store:
            </p>
            <Link
              href={`/search?q=${encodeURIComponent(current.query)}`}
              className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-paper hover:bg-ink-soft"
            >
              Search {current.label.toLowerCase()}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div key={key} className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, i) => (
              <SaleCard key={item.ref} item={item} index={i} />
            ))}
          </div>
        )}

        {data && data !== 'error' && data.checkedAt && items.length > 0 && (
          <p className="mt-8 text-[13px] text-muted">
            Sale prices checked {timeAgo(data.checkedAt)}. Sales end without notice, so the store&apos;s page has the final
            price.
          </p>
        )}
      </div>

      <Link
        href="/coupons"
        className="mt-14 flex max-w-xl items-center gap-4 rounded-2xl p-5 ring-1 ring-line transition-colors hover:bg-canvas"
      >
        <TicketIcon size={22} className="shrink-0 text-sticker" />
        <span>
          <span className="block text-[15px] font-bold">Coupons and offers</span>
          <span className="block text-[14px] text-muted">Promo codes stores publish, and which stores have sales on.</span>
        </span>
      </Link>
    </div>
  );
}
