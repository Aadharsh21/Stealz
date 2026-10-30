'use client';

import Link from 'next/link';
import type { Listing, SearchSummary } from '@/lib/types';
import { productHref } from '@/lib/ref';
import { ShieldIcon, TruckIcon } from './icons';
import { Money, StoreLogo } from './ui';

function Cell({
  listing,
  heading,
  detail,
  highlight = false,
}: {
  listing: Listing;
  heading: React.ReactNode;
  detail: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={productHref(listing.ref)}
      className={`group flex flex-col rounded-2xl p-4 ring-1 transition-colors ${
        highlight ? 'bg-sticker/15 ring-sticker hover:bg-sticker/25' : 'bg-paper ring-line hover:bg-canvas'
      }`}
    >
      <div className="flex items-center justify-between gap-2">{heading}</div>
      <div className="mt-3 flex items-center gap-2">
        <StoreLogo src={listing.storeLogo} name={listing.store} size={20} />
        <span className="truncate text-[14px] font-bold">{listing.store}</span>
      </div>
      <Money amount={listing.total} currency={listing.currency} className="type-cond mt-1 text-[30px] font-extrabold leading-tight" />
      <p className="line-clamp-1 text-[13px] text-muted">{listing.title}</p>
      <p className="mt-2 text-[13px] leading-snug text-ink-soft">{detail}</p>
    </Link>
  );
}

export function VerdictStrip({ summary }: { summary: SearchSummary }) {
  const { cheapest, fastest, bestValue } = summary;
  if (!cheapest) return null;
  const showFastest = fastest && fastest.id !== cheapest.id;
  const showBest = bestValue && bestValue.id !== cheapest.id && bestValue.id !== fastest?.id;
  const cells = 1 + Number(Boolean(showFastest)) + Number(Boolean(showBest));
  const cols = cells === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : cells === 2 ? 'sm:grid-cols-2' : 'sm:max-w-md';
  return (
    <section aria-label="Quick answers" className={`grid gap-3 ${cols}`}>
      <Cell
        listing={cheapest}
        highlight
        heading={<span className="text-[13px] font-semibold text-ink-soft">Lowest total</span>}
        detail={
          <>
            {cheapest.delivery.label}
            {!cheapest.totalIsComplete && '. Shipping not listed'}
          </>
        }
      />
      {showFastest && fastest && (
        <Cell
          listing={fastest}
          heading={
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
              <TruckIcon size={16} /> Fastest delivery
            </span>
          }
          detail={fastest.delivery.label}
        />
      )}
      {showBest && bestValue && (
        <Cell
          listing={bestValue}
          heading={
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
              <ShieldIcon size={16} /> Best overall
            </span>
          }
          detail={summary.bestValueReason}
        />
      )}
    </section>
  );
}
