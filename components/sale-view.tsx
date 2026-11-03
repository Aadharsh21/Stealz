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
import { ChevronRightIcon, TicketIcon, XIcon } from './icons';
import { useLocation } from './location-provider';
import { DiscountTag, ProductImage } from './product-card';
import { Skeleton, WasPrice, buttonClass, chipClass } from './ui';

type SortKey = 'discount' | 'price';

function SaleCard({ item, index }: { item: SaleItem; index: number }) {
  return (
    <Link href={productHref(item.ref)} className="press-soft rise-in group block min-w-0" style={{ '--i': index } as React.CSSProperties}>
      <div className="relative">
        <ProductImage src={item.image} alt={item.title} className="aspect-[4/5]" zoom />
        <DiscountTag className="absolute left-2.5 top-2.5">{item.pct != null ? `${item.pct}% off` : 'On sale'}</DiscountTag>
      </div>
      <p className="mt-3 truncate text-footnote text-muted">{item.brand ?? '\u00a0'}</p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.8em] break-words text-subhead font-semibold">{item.title}</h3>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="price text-[1.25rem] leading-none">{formatMoney(item.price, item.currency)}</span>
        {item.originalPrice != null && <WasPrice amount={item.originalPrice} currency={item.currency} className="text-footnote" />}
      </p>
      <p className="mt-1 truncate text-footnote text-muted">
        at {item.store}
        {item.storeCount > 1 && ` and ${item.storeCount - 1} more`}
      </p>
    </Link>
  );
}

function SaleSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-tile" />
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
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <header className="max-w-3xl">
        <h1 className="text-title1">On sale</h1>
        <p className="mt-4 max-w-[52ch] text-intro text-ink-soft">
          Markdowns from stores that deliver to {COUNTRIES[country].inPhrase}. Fake shops, used items and inflated &ldquo;was&rdquo;
          prices are left out, and each item opens a full comparison with delivery and tax.
        </p>
      </header>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label="Categories" className="shelf -mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:max-w-full sm:px-0">
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
                className={chipClass(selected)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="select">
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
            className={chipClass(true)}
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
          <div className="max-w-xl rounded-card bg-canvas p-6">
            <p className="text-callout text-ink-soft">
              {data === 'error'
                ? "Sales for this category couldn't be loaded right now."
                : store
                  ? `${store} has nothing on sale in ${current.label.toLowerCase()} right now.`
                  : `No markdowns found in ${current.label.toLowerCase()} this week.`}{' '}
              Search it directly to compare every store:
            </p>
            <Link href={`/search?q=${encodeURIComponent(current.query)}`} className={`${buttonClass('primary', 'sm')} mt-4`}>
              Search {current.label.toLowerCase()}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div key={key} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, i) => (
              <SaleCard key={item.ref} item={item} index={i} />
            ))}
          </div>
        )}

        {data && data !== 'error' && data.checkedAt && items.length > 0 && (
          <p className="mt-8 text-footnote text-muted">
            Sale prices checked {timeAgo(data.checkedAt)}. Sales end without notice, so the store&apos;s page has the final
            price.
          </p>
        )}
      </div>

      <Link href="/coupons" className="press-soft mt-14 flex max-w-xl items-center gap-4 rounded-card bg-canvas p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sticker/20 text-accent-ink">
          <TicketIcon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-headline">Coupons and offers</span>
          <span className="block text-subhead text-muted">Promo codes stores publish, and which stores have sales on.</span>
        </span>
        <ChevronRightIcon size={18} strokeWidth={2.2} className="shrink-0 text-muted" />
      </Link>
    </div>
  );
}
