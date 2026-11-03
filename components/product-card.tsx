'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Listing, ProductGroup } from '@/lib/types';
import { discountPercent } from '@/lib/offer';
import { productHref } from '@/lib/ref';
import { ExternalIcon, StoreIcon, TruckIcon } from './icons';
import { Badge, Money, Sticker, StoreLogo, WasPrice, buttonClass } from './ui';

function Photo({ src, alt, zoom }: { src: string; alt: string; zoom: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // An image already in the cache can finish loading before React attaches onLoad.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  if (failed) return <Placeholder />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      data-loaded={loaded}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`photo h-full w-full object-contain p-[8%] mix-blend-multiply ${zoom ? 'group-hover:scale-[1.04]' : ''}`}
    />
  );
}

function Placeholder() {
  return (
    <div className="grid h-full w-full place-items-center text-[#8e8e93]">
      <StoreIcon size={28} />
    </div>
  );
}

/** A product photo on a light tile. White photo backgrounds melt into the tile. */
export function ProductImage({
  src,
  alt,
  className = '',
  radius = 'rounded-tile',
  zoom = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  radius?: string;
  zoom?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-plinth ${radius} ${className}`}>
      {src ? <Photo key={src} src={src} alt={alt} zoom={zoom} /> : <Placeholder />}
    </div>
  );
}

/** Percent-off tag that sits on a product photo. The tile is always light, so its colors are fixed. */
export function DiscountTag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full bg-white px-2.5 text-footnote font-bold leading-none text-[#c4000f] shadow-[0_1px_3px_rgba(0,0,0,0.12)] ${className}`}
    >
      {children}
    </span>
  );
}

/** Percent off for a listing, unless the discount looks inflated. */
export function salePercent(l: Listing): number | null {
  return l.discountNote ? null : (discountPercent(l.price, l.originalPrice) ?? l.discountPct ?? null);
}

function sellerBadges(l: Listing, hideSale = false) {
  const pct = hideSale ? null : salePercent(l);
  return (
    <>
      {l.colorNote && <Badge tone="warn">{l.colorNote}</Badge>}
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
  // On-sale items get a tag on the photo, from whichever store has the markdown.
  const salePct = group.listings.map(salePercent).find((p): p is number => p != null) ?? null;
  return (
    <Link href={productHref(group.ref)} className="press-soft group block min-w-0">
      <div className="relative">
        <ProductImage src={group.image} alt={group.title} className="aspect-square" zoom />
        {(isCheapest || salePct != null) && (
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {isCheapest && <Sticker animate>Lowest total</Sticker>}
            {salePct != null && <DiscountTag>{salePct}% off</DiscountTag>}
          </div>
        )}
      </div>
      <div className="mt-3">
        {group.brand && <p className="truncate text-footnote font-medium text-muted">{group.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 break-words text-subhead font-semibold text-ink">{group.title}</h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Money amount={best.total} currency={best.currency} className="price text-[1.375rem] leading-none" />
          {best.originalPrice != null && !best.discountNote && (
            <WasPrice amount={best.originalPrice} currency={best.currency} className="text-footnote" />
          )}
        </div>
        <p className="mt-1.5 text-footnote text-muted">
          Total at <span className="font-semibold text-ink-soft">{best.store}</span>
          {!best.totalIsComplete && ', plus shipping'}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-footnote text-ink-soft">
          <TruckIcon size={15} className="mt-px shrink-0" />
          <span className="min-w-0">{best.delivery.label}</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {more > 0 && <Badge>{`${group.storeCount} stores`}</Badge>}
          {sellerBadges(best, salePct != null)}
        </div>
      </div>
    </Link>
  );
}

export function ListingRow({ listing, isCheapest }: { listing: Listing; isCheapest: boolean }) {
  const l = listing;
  const outbound = l.linkIsSearch ? (l.googleLink ?? l.link) : l.link;
  const taxText =
    l.tax.mode === 'estimated' || l.tax.mode === 'exact'
      ? `${l.tax.amount ? `+ ${new Intl.NumberFormat('en-US', { style: 'currency', currency: l.currency, currencyDisplay: l.currency === 'AED' ? 'code' : 'narrowSymbol' }).format(l.tax.amount)}` : 'no'} tax`
      : l.tax.mode === 'included'
        ? l.tax.note.toLowerCase()
        : l.tax.mode === 'none'
          ? 'no tax'
          : 'plus tax';
  return (
    <li className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto]">
      <ProductImage src={l.image} alt="" radius="rounded-xl" className="h-16 w-16 sm:h-[72px] sm:w-[72px]" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <StoreLogo src={l.storeLogo} name={l.store} size={18} />
          <span className="truncate text-subhead font-semibold">{l.store}</span>
          {isCheapest && <Sticker>Lowest total</Sticker>}
        </div>
        <Link href={productHref(l.ref)} className="mt-1 line-clamp-1 text-subhead text-ink-soft hover:text-ink hover:underline">
          {l.title}
        </Link>
        <p className="tnum mt-1 text-footnote text-muted">
          <Money amount={l.price} currency={l.currency} /> item, {l.shipping.label.toLowerCase()}, {taxText}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-footnote text-ink-soft">
          <TruckIcon size={15} className="mt-px shrink-0" />
          <span className="min-w-0">{l.delivery.label}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">{sellerBadges(l)}</div>
      </div>
      <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:col-span-1 sm:flex-col sm:flex-nowrap sm:items-end sm:justify-start">
        <div className="sm:text-right">
          <Money amount={l.total} currency={l.currency} className="price block text-[1.375rem] leading-none" />
          <span className="text-caption text-muted">{l.totalIsComplete ? 'total' : 'before shipping'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={productHref(l.ref)} className={buttonClass('secondary', 'sm')}>
            Compare stores
          </Link>
          {outbound && (
            <a
              href={outbound}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="press relative grid h-9 w-9 place-items-center rounded-full bg-fill hover:bg-fill-strong after:absolute after:-inset-1 after:content-['']"
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
