'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CurrencyCode } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { productHref } from '@/lib/ref';
import type { WatchItem } from '@/lib/storage';
import { loadWatchlist, saveWatchlist } from '@/lib/storage';
import { ArrowDownIcon, BookmarkIcon } from './icons';
import { ProductImage } from './product-card';
import { buttonClass } from './ui';

function Change({ item }: { item: WatchItem }) {
  if (item.lastTotal == null || item.lastTotal === item.savedTotal) return null;
  const diff = item.lastTotal - item.savedTotal;
  const money = (n: number) => formatMoney(Math.abs(n), item.currency as CurrencyCode);
  return diff < 0 ? (
    <p className="mt-1 inline-flex items-center gap-1 text-footnote font-semibold text-good">
      <ArrowDownIcon size={14} /> {money(diff)} lower than when you saved it
    </p>
  ) : (
    <p className="mt-1 text-footnote text-muted">{money(diff)} higher than when you saved it</p>
  );
}

export function WatchlistView() {
  const [items, setItems] = useState<WatchItem[] | null>(null);

  useEffect(() => {
    const update = () => setItems(loadWatchlist());
    update();
    window.addEventListener('stealz:watchlist', update);
    return () => window.removeEventListener('stealz:watchlist', update);
  }, []);

  function remove(key: string) {
    saveWatchlist((items ?? []).filter((i) => i.key !== key));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-title1">Your watchlist</h1>
      <p className="mt-3 text-callout text-ink-soft">
        Items you saved on this device. Open one to check today&apos;s prices, or set an email alert from its page.
      </p>

      {items && items.length === 0 && (
        <div className="mt-10 rounded-card bg-canvas px-6 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sticker/20 text-accent-ink">
            <BookmarkIcon size={22} />
          </span>
          <p className="mt-4 text-headline">Nothing saved yet</p>
          <p className="mt-1 text-subhead text-ink-soft">Tap Save on any product to keep it here and see how its price moves.</p>
          <Link href="/" className={`${buttonClass('primary')} mt-5`}>
            Start a search
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="divide-hairline mt-8 overflow-hidden rounded-card bg-canvas">
          {items.map((item) => (
            <li key={item.key} className="flex gap-4 p-4 sm:p-5">
              <ProductImage src={item.image} alt="" radius="rounded-xl" className="h-20 w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <Link href={productHref(item.ref)} className="line-clamp-2 break-words text-headline hover:underline">
                  {item.title}
                </Link>
                <p className="tnum mt-1 text-subhead text-ink-soft">
                  {formatMoney(item.savedTotal, item.currency as CurrencyCode)} at {item.store} when saved on{' '}
                  {new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <Change item={item} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Link href={productHref(item.ref)} className={buttonClass('primary', 'sm')}>
                  Check prices
                </Link>
                <button type="button" onClick={() => remove(item.key)} className="press rounded-full px-2 py-1.5 text-footnote font-semibold text-muted hover:text-ink">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
