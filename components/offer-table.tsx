'use client';

import { useMemo, useState } from 'react';
import type { Offer } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { discountPercent } from '@/lib/offer';
import { cheapestOf, effectiveDays, effectiveTotal, fastestOf } from '@/lib/scoring';
import { AlertIcon, ExternalIcon, TicketIcon } from './icons';
import { Badge, Money, Stars, Sticker, StoreLogo, WasPrice } from './ui';

type SortBy = 'total' | 'arrival';

function taxCell(o: Offer): string {
  switch (o.tax.mode) {
    case 'included':
      return o.tax.note.replace(/^Incl\./, 'Included');
    case 'none':
      return 'None';
    case 'estimated':
    case 'exact':
      return o.tax.amount != null ? formatMoney(o.tax.amount, o.currency) : '—';
    default:
      return 'Not included';
  }
}

function StoreBadges({ o }: { o: Offer }) {
  const pct = o.discountNote ? null : discountPercent(o.price, o.originalPrice);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {o.priceWarning && <Badge tone="warn">Check this price</Badge>}
      {o.tags.includes('Unverified seller') && <Badge tone="warn">Unverified seller</Badge>}
      {o.isBrandStore && <Badge tone="info">Brand store</Badge>}
      {o.isMarketplace && <Badge tone="warn">Marketplace seller</Badge>}
      {pct != null && <Badge tone="sale">{pct}% off</Badge>}
      {o.coupon && (
        <Badge tone="good">
          <TicketIcon size={12} /> Code {o.coupon}
        </Badge>
      )}
      {o.tags
        .filter((t) => !/% off$|^Coupon$|^Inflated discount$|^Check this price$|^Unverified seller$/.test(t))
        .slice(0, 2)
        .map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      {o.inStock === false && <Badge tone="warn">Out of stock</Badge>}
    </div>
  );
}

function GoButton({ o, compact = false }: { o: Offer; compact?: boolean }) {
  if (!o.link) return null;
  return (
    <a
      href={o.link}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink font-semibold text-paper hover:bg-ink-soft ${
        compact ? 'h-9 px-3.5 text-[13px]' : 'h-9 px-4 text-[13px]'
      }`}
      aria-label={`Go to ${o.store} (opens in a new tab)`}
    >
      Go to store <ExternalIcon size={14} />
    </a>
  );
}

export function OfferTable({ offers }: { offers: Offer[] }) {
  const [sortBy, setSortBy] = useState<SortBy>('total');
  const cheapest = cheapestOf(offers);
  const fastest = fastestOf(offers);
  const rows = useMemo(
    () =>
      [...offers].sort((a, b) =>
        sortBy === 'total'
          ? effectiveTotal(a) - effectiveTotal(b) || effectiveDays(a) - effectiveDays(b)
          : effectiveDays(a) - effectiveDays(b) || effectiveTotal(a) - effectiveTotal(b),
      ),
    [offers, sortBy],
  );
  const usTax = offers.some((o) => o.tax.mode === 'estimated' || o.tax.mode === 'exact' || o.tax.mode === 'unknown' || o.tax.mode === 'none');

  const sortButton = (key: SortBy, label: string) => (
    <button
      type="button"
      onClick={() => setSortBy(key)}
      aria-pressed={sortBy === key}
      className={`rounded-full px-3 py-1 text-[13px] font-semibold ${sortBy === key ? 'bg-ink text-paper' : 'text-ink-soft ring-1 ring-line-strong hover:bg-canvas'}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Sort by</span>
        {sortButton('total', 'Lowest total')}
        {sortButton('arrival', 'Soonest arrival')}
      </div>

      {/* Wide screens: a real table so columns line up for comparison. */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0 text-left text-[14px]">
          <caption className="sr-only">Prices, shipping, tax, totals and delivery dates by store</caption>
          <thead>
            <tr className="text-[12px] text-muted">
              <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">Store</th>
              <th scope="col" className="border-b border-line px-3 py-2 text-right font-semibold">Item</th>
              <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Shipping</th>
              <th scope="col" className="border-b border-line px-3 py-2 text-right font-semibold">{usTax ? 'Est. tax' : 'Tax'}</th>
              <th scope="col" className="border-b border-line px-3 py-2 text-right font-semibold">Total</th>
              <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Arrives</th>
              <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Returns</th>
              <th scope="col" className="border-b border-line py-2 pl-3"><span className="sr-only">Link</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const isCheapest = cheapest?.id === o.id;
              return (
                <tr key={o.id} className={`align-top ${isCheapest ? 'bg-sticker/[0.07]' : ''}`}>
                  <td className="border-b border-line py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <StoreLogo src={o.storeLogo} name={o.store} size={20} />
                      <span className="font-bold">{o.store}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <Stars rating={o.rating} reviews={o.reviews} />
                      {o.sellerNote && <span className="text-[12px] text-muted">{o.sellerNote}</span>}
                    </div>
                    <StoreBadges o={o} />
                    {(o.priceWarning ?? o.discountNote) && (
                      <p className="mt-2 flex max-w-sm gap-1.5 text-[12px] leading-snug text-warning">
                        <AlertIcon size={14} className="mt-px shrink-0" />
                        {o.priceWarning ?? o.discountNote}
                      </p>
                    )}
                  </td>
                  <td className="tnum border-b border-line px-3 py-4 text-right">
                    <Money amount={o.price} currency={o.currency} />
                    {o.originalPrice != null && (
                      <div className="text-[12px]">
                        <WasPrice amount={o.originalPrice} currency={o.currency} />
                      </div>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-4 text-ink-soft">{o.shipping.free ? 'Free' : o.shipping.cost != null ? formatMoney(o.shipping.cost, o.currency) : o.shipping.label}</td>
                  <td className="tnum border-b border-line px-3 py-4 text-right text-ink-soft" title={o.tax.note}>
                    {taxCell(o)}
                  </td>
                  <td className="border-b border-line px-3 py-4 text-right">
                    <Money amount={o.total} currency={o.currency} tabular className="type-cond text-[22px] font-extrabold" />
                    {isCheapest && (
                      <div className="mt-1">
                        <Sticker animate>Lowest total</Sticker>
                      </div>
                    )}
                    {!o.totalIsComplete && <div className="text-[12px] text-muted">+ shipping</div>}
                  </td>
                  <td className="border-b border-line px-3 py-4">
                    <span className={fastest?.id === o.id ? 'font-bold text-ink' : 'text-ink-soft'}>{o.delivery.label}</span>
                    {fastest?.id === o.id && <div className="text-[12px] text-series">Fastest</div>}
                  </td>
                  <td className="border-b border-line px-3 py-4 text-ink-soft">{o.returns?.label ?? 'Not listed'}</td>
                  <td className="border-b border-line py-4 pl-3 text-right">
                    <GoButton o={o} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per store with the same facts. */}
      <ul className="mt-4 space-y-3 md:hidden">
        {rows.map((o) => {
          const isCheapest = cheapest?.id === o.id;
          return (
            <li key={o.id} className={`rounded-2xl p-4 ring-1 ${isCheapest ? 'bg-sticker/[0.07] ring-sticker/70' : 'ring-line'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StoreLogo src={o.storeLogo} name={o.store} size={20} />
                    <span className="truncate font-bold">{o.store}</span>
                  </div>
                  <Stars rating={o.rating} reviews={o.reviews} />
                </div>
                <div className="text-right">
                  <Money amount={o.total} currency={o.currency} className="type-cond block text-[24px] font-extrabold leading-none" />
                  {isCheapest && <Sticker className="mt-1.5">Lowest total</Sticker>}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-muted">Item</dt>
                <dd className="text-right">
                  {o.originalPrice != null && <WasPrice amount={o.originalPrice} currency={o.currency} className="mr-2" />}
                  {formatMoney(o.price, o.currency)}
                </dd>
                <dt className="text-muted">Shipping</dt>
                <dd className="text-right">{o.shipping.free ? 'Free' : o.shipping.cost != null ? formatMoney(o.shipping.cost, o.currency) : 'Not listed'}</dd>
                <dt className="text-muted">{usTax ? 'Est. tax' : 'Tax'}</dt>
                <dd className="text-right">{taxCell(o)}</dd>
                <dt className="text-muted">Arrives</dt>
                <dd className={`text-right ${fastest?.id === o.id ? 'font-bold' : ''}`}>{o.delivery.label.replace(/^Arrives /, '')}</dd>
                <dt className="text-muted">Returns</dt>
                <dd className="text-right">{o.returns?.label ?? 'Not listed'}</dd>
              </dl>
              <StoreBadges o={o} />
              {(o.priceWarning ?? o.discountNote) && (
                <p className="mt-2 text-[12px] leading-snug text-warning">{o.priceWarning ?? o.discountNote}</p>
              )}
              <div className="mt-3 flex justify-end">
                <GoButton o={o} compact />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
