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
    <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-good">
      <ArrowDownIcon size={14} /> {money(diff)} lower than when you saved it
    </p>
  ) : (
    <p className="mt-1 text-[13px] text-muted">{money(diff)} higher than when you saved it</p>
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
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-10 sm:px-6">
      <h1 className="type-wide text-[30px] font-extrabold tracking-[-0.03em]">Your watchlist</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        Items you saved on this device. Open one to check today&apos;s prices, or set an email alert from its page.
      </p>

      {items && items.length === 0 && (
        <div className="mt-10 rounded-2xl p-8 text-center ring-1 ring-line">
          <BookmarkIcon size={28} className="mx-auto text-muted" />
          <p className="mt-3 font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-[14px] text-ink-soft">Tap Save on any product to keep it here.</p>
          <Link href="/" className={`${buttonClass('primary')} mt-5`}>
            Start a search
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.key} className="flex gap-4 py-5">
              <ProductImage src={item.image} alt="" className="h-20 w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <Link href={productHref(item.ref)} className="line-clamp-2 font-semibold hover:underline">
                  {item.title}
                </Link>
                <p className="mt-1 text-[14px] text-ink-soft">
                  {formatMoney(item.savedTotal, item.currency as CurrencyCode)} at {item.store} when saved on{' '}
                  {new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <Change item={item} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Link href={productHref(item.ref)} className={buttonClass('primary', 'sm')}>
                  Check prices
                </Link>
                <button type="button" onClick={() => remove(item.key)} className="text-[13px] font-semibold text-muted hover:text-ink">
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
