'use client';

import Link from 'next/link';
import type { Listing, ProductGroup } from '@/lib/types';
import { discountPercent } from '@/lib/offer';
import { productHref } from '@/lib/ref';
import { ExternalIcon, StoreIcon, TruckIcon } from './icons';
import { Badge, Money, Sticker, StoreLogo, WasPrice } from './ui';

export function ProductImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-canvas dark:bg-white ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-3 mix-blend-multiply"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted">
          <StoreIcon size={28} />
        </div>
      )}
    </div>
  );
}

function sellerBadges(l: Listing) {
  const pct = l.discountNote ? null : discountPercent(l.price, l.originalPrice);
  return (
    <>
      {l.priceWarning && <Badge tone="warn">Check this price</Badge>}
      {l.tags.includes('Unverified seller') && <Badge tone="warn">Unverified seller</Badge>}
      {pct != null && <Badge tone="sale">{pct}% off</Badge>}
      {l.discountNote && <Badge tone="warn">Inflated discount</Badge>}
      {l.shipping.free && <Badge>Free shipping</Badge>}
      {l.isBrandStore && <Badge tone="info">Brand store</Badge>}
      {l.isMarketplace && <Badge tone="warn">Marketplace seller</Badge>}
      {l.nearby && <Badge tone="good">{l.nearby}</Badge>}
    </>
  );
}

export function ProductCard({ group, isCheapest }: { group: ProductGroup; isCheapest: boolean }) {
  const best = group.listings[0];
  const more = group.storeCount - 1;
  return (
    <Link href={productHref(group.ref)} className="group block rounded-2xl p-2 -m-2 hover:bg-canvas/60">
      <div className="relative">
        <ProductImage src={group.image} alt={group.title} className="aspect-square" />
        {isCheapest && (
          <Sticker animate className="absolute left-3 top-3">
            Lowest total
          </Sticker>
        )}
      </div>
      <div className="mt-3 px-1">
        {group.brand && <p className="text-[13px] font-medium text-muted">{group.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:underline group-hover:underline-offset-2">
          {group.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <Money amount={best.total} currency={best.currency} className="type-cond text-[26px] font-extrabold leading-none tracking-[-0.01em]" />
          {best.originalPrice != null && !best.discountNote && <WasPrice amount={best.originalPrice} currency={best.currency} className="text-[14px]" />}
        </div>
        <p className="mt-1 text-[13px] text-muted">
          Total at <span className="font-semibold text-ink-soft">{best.store}</span>
          {!best.totalIsComplete && ', plus shipping'}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <TruckIcon size={15} className="shrink-0" />
          {best.delivery.label}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {more > 0 && <Badge>{`${group.storeCount} stores`}</Badge>}
          {sellerBadges(best)}
        </div>
      </div>
    </Link>
  );
}

export function ListingRow({ listing, isCheapest }: { listing: Listing; isCheapest: boolean }) {
  const l = listing;
  const outbound = l.link ?? l.googleLink;
  const taxText =
    l.tax.mode === 'estimated' || l.tax.mode === 'exact'
      ? `${l.tax.amount ? `+ ${new Intl.NumberFormat('en-US', { style: 'currency', currency: l.currency, currencyDisplay: l.currency === 'AED' ? 'code' : 'narrowSymbol' }).format(l.tax.amount)}` : 'no'} tax`
      : l.tax.mode === 'included'
        ? l.tax.note.toLowerCase()
        : l.tax.mode === 'none'
          ? 'no tax'
          : 'plus tax';
  return (
    <li className="grid grid-cols-[64px_1fr] gap-4 border-b border-line py-4 sm:grid-cols-[72px_1fr_auto]">
      <ProductImage src={l.image} alt="" className="h-16 w-16 sm:h-[72px] sm:w-[72px]" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StoreLogo src={l.storeLogo} name={l.store} size={18} />
          <span className="truncate text-[14px] font-bold">{l.store}</span>
          {isCheapest && <Sticker>Lowest total</Sticker>}
        </div>
        <Link href={productHref(l.ref)} className="mt-1 line-clamp-1 text-[14px] text-ink-soft hover:text-ink hover:underline">
          {l.title}
        </Link>
        <p className="tnum mt-1 text-[13px] text-muted">
          <Money amount={l.price} currency={l.currency} /> item, {l.shipping.label.toLowerCase()}, {taxText}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <TruckIcon size={15} className="shrink-0" />
          {l.delivery.label}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">{sellerBadges(l)}</div>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
        <div className="text-right">
          <Money amount={l.total} currency={l.currency} className="type-cond block text-[24px] font-extrabold leading-none" />
          <span className="text-[12px] text-muted">{l.totalIsComplete ? 'total' : 'before shipping'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={productHref(l.ref)} className="rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-line-strong hover:bg-canvas">
            Compare stores
          </Link>
          {outbound && (
            <a
              href={outbound}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="grid h-8 w-8 place-items-center rounded-full ring-1 ring-line-strong hover:bg-canvas"
              aria-label={`Open at ${l.store} in a new tab`}
            >
              <ExternalIcon size={16} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
