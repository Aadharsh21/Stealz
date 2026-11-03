'use client';

import Link from 'next/link';
import type { Listing, SearchSummary } from '@/lib/types';
import { productHref } from '@/lib/ref';
import { ShieldIcon, TagIcon, TruckIcon } from './icons';
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
      className={`press-soft flex min-w-0 flex-col rounded-card p-5 ${
        highlight ? 'bg-sticker/[0.1] ring-1 ring-inset ring-sticker/60 hover:bg-sticker/[0.14]' : 'bg-canvas hover:bg-smoke/70'
      }`}
    >
      <div className={`flex items-center gap-1.5 text-footnote font-semibold ${highlight ? 'text-accent-ink' : 'text-ink-soft'}`}>{heading}</div>
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <StoreLogo src={listing.storeLogo} name={listing.store} size={20} />
        <span className="truncate text-subhead font-semibold">{listing.store}</span>
      </div>
      <Money amount={listing.total} currency={listing.currency} className="price mt-1.5 text-[2rem] leading-none" />
      <p className="mt-1.5 line-clamp-1 text-footnote text-muted">{listing.title}</p>
      <p className="mt-2 text-footnote text-ink-soft">{detail}</p>
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
    <section aria-label="Quick answers" className={`grid grid-cols-1 gap-3 ${cols}`}>
      <Cell
        listing={cheapest}
        highlight
        heading={
          <>
            <TagIcon size={15} strokeWidth={2} /> Lowest total
          </>
        }
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
            <>
              <TruckIcon size={15} strokeWidth={2} /> Fastest delivery
            </>
          }
          detail={fastest.delivery.label}
        />
      )}
      {showBest && bestValue && (
        <Cell
          listing={bestValue}
          heading={
            <>
              <ShieldIcon size={15} strokeWidth={2} /> Best overall
            </>
          }
          detail={summary.bestValueReason}
        />
      )}
    </section>
  );
}
