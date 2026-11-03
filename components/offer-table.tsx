'use client';

import { useMemo, useState } from 'react';
import type { Offer } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { discountPercent } from '@/lib/offer';
import { cheapestOf, effectiveDays, effectiveTotal, fastestOf } from '@/lib/scoring';
import { AlertIcon, ExternalIcon, TicketIcon } from './icons';
import { Badge, Money, Segmented, Stars, Sticker, StoreLogo, WasPrice } from './ui';

type SortBy = 'total' | 'arrival';

function taxCell(o: Offer): string {
  switch (o.tax.mode) {
    case 'included':
      return o.tax.note.replace(/^Incl\./, 'Included');
    case 'none':
      return 'None';
    case 'estimated':
    case 'exact':
      return o.tax.amount != null ? formatMoney(o.tax.amount, o.currency) : 'Not listed';
    default:
      return 'Not included';
  }
}

function StoreBadges({ o }: { o: Offer }) {
  const pct = o.discountNote ? null : discountPercent(o.price, o.originalPrice);
  const extra = o.tags
    .filter((t) => !/% off$|^Coupon$|^Inflated discount$|^Check this price$|^Unverified seller$|^Different color$/.test(t))
    .slice(0, 2);
  const any = o.colorNote || o.priceWarning || o.tags.includes('Unverified seller') || o.isBrandStore || o.isMarketplace || pct != null || o.coupon || extra.length || o.inStock === false;
  if (!any) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {o.colorNote && <Badge tone="warn">{o.colorNote}</Badge>}
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
      {extra.map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
      {o.inStock === false && <Badge tone="warn">Out of stock</Badge>}
    </div>
  );
}

function Warning({ o }: { o: Offer }) {
  const text = o.priceWarning ?? o.discountNote;
  if (!text) return null;
  return (
    <p className="mt-2 flex max-w-sm gap-1.5 text-footnote text-warning">
      <AlertIcon size={14} className="mt-0.5 shrink-0" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}

function GoButton({ o }: { o: Offer }) {
  if (!o.link) return null;
  return (
    <a
      href={o.link}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="press relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-subhead font-semibold text-paper hover:bg-ink/85 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
      aria-label={o.linkIsSearch ? `Search Google for this item at ${o.store} (opens in a new tab)` : `Go to ${o.store} (opens in a new tab)`}
    >
      {o.linkIsSearch ? 'Find it' : 'Go to store'} <ExternalIcon size={13} strokeWidth={2.2} />
    </a>
  );
}

function shippingCell(o: Offer, fallback: string): string {
  return o.shipping.free ? 'Free' : o.shipping.cost != null ? formatMoney(o.shipping.cost, o.currency) : fallback;
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
  const th = 'px-3 py-3 text-footnote font-semibold text-muted';

  return (
    <div>
      <Segmented
        label="Sort stores by"
        size="sm"
        className="w-full max-w-[20rem]"
        value={sortBy}
        onChange={setSortBy}
        options={[
          { value: 'total', label: 'Lowest total' },
          { value: 'arrival', label: 'Soonest arrival' },
        ]}
      />

      {/* Wide screens: a real table so columns line up for comparison. */}
      <div className="mt-4 hidden overflow-hidden rounded-card bg-canvas md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-left text-subhead">
            <caption className="sr-only">Prices, shipping, tax, totals and delivery dates by store</caption>
            <thead>
              <tr>
                <th scope="col" className={`${th} pl-5`}>Store</th>
                <th scope="col" className={`${th} text-right`}>Item</th>
                <th scope="col" className={th}>Shipping</th>
                <th scope="col" className={`${th} text-right`}>{usTax ? 'Est. tax' : 'Tax'}</th>
                <th scope="col" className={`${th} text-right`}>Total</th>
                <th scope="col" className={th}>Arrives</th>
                <th scope="col" className={th}>Returns</th>
                <th scope="col" className={`${th} pr-5`}><span className="sr-only">Link</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const isCheapest = cheapest?.id === o.id;
                const cell = `hairline-t px-3 py-4 align-top ${isCheapest ? 'bg-sticker/[0.09]' : ''}`;
                return (
                  <tr key={o.id}>
                    <td className={`${cell} min-w-[13rem] max-w-[20rem] pl-5`}>
                      <div className="flex min-w-0 items-center gap-2">
                        <StoreLogo src={o.storeLogo} name={o.store} size={20} />
                        <span className="break-words font-semibold">{o.store}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3">
                        <Stars rating={o.rating} reviews={o.reviews} />
                        {o.sellerNote && <span className="text-footnote text-muted">{o.sellerNote}</span>}
                      </div>
                      <StoreBadges o={o} />
                      <Warning o={o} />
                    </td>
                    <td className={`${cell} tnum whitespace-nowrap text-right`}>
                      <Money amount={o.price} currency={o.currency} />
                      {o.originalPrice != null && (
                        <div className="text-footnote">
                          <WasPrice amount={o.originalPrice} currency={o.currency} />
                        </div>
                      )}
                    </td>
                    <td className={`${cell} whitespace-nowrap text-ink-soft`}>{shippingCell(o, o.shipping.label)}</td>
                    <td className={`${cell} tnum whitespace-nowrap text-right text-ink-soft`} title={o.tax.note}>
                      {taxCell(o)}
                    </td>
                    <td className={`${cell} whitespace-nowrap text-right`}>
                      <Money amount={o.total} currency={o.currency} className="price text-[1.375rem] leading-none" />
                      {isCheapest && (
                        <div className="mt-1.5">
                          <Sticker animate>Lowest total</Sticker>
                        </div>
                      )}
                      {!o.totalIsComplete && <div className="text-footnote text-muted">+ shipping</div>}
                    </td>
                    <td className={`${cell} min-w-[9.5rem]`}>
                      <span className={fastest?.id === o.id ? 'font-semibold text-ink' : 'text-ink-soft'}>{o.delivery.label}</span>
                      {fastest?.id === o.id && <div className="text-footnote font-semibold text-accent-ink">Fastest</div>}
                    </td>
                    <td className={`${cell} min-w-[7rem] text-ink-soft`}>{o.returns?.label ?? 'Not listed'}</td>
                    <td className={`${cell} pr-5 text-right`}>
                      <GoButton o={o} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phones: one card per store with the same facts. */}
      <ul className="mt-4 space-y-3 md:hidden">
        {rows.map((o) => {
          const isCheapest = cheapest?.id === o.id;
          return (
            <li key={o.id} className={`rounded-card p-4 ${isCheapest ? 'bg-sticker/[0.1] ring-1 ring-inset ring-sticker/60' : 'bg-canvas'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <StoreLogo src={o.storeLogo} name={o.store} size={20} />
                    <span className="truncate text-headline">{o.store}</span>
                  </div>
                  <div className="mt-0.5">
                    <Stars rating={o.rating} reviews={o.reviews} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Money amount={o.total} currency={o.currency} className="price block text-[1.5rem] leading-none" />
                  {isCheapest && <Sticker className="mt-1.5">Lowest total</Sticker>}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-subhead">
                <dt className="text-muted">Item</dt>
                <dd className="tnum text-right">
                  {o.originalPrice != null && <WasPrice amount={o.originalPrice} currency={o.currency} className="mr-2 text-footnote" />}
                  {formatMoney(o.price, o.currency)}
                </dd>
                <dt className="text-muted">Shipping</dt>
                <dd className="tnum text-right">{shippingCell(o, 'Not listed')}</dd>
                <dt className="text-muted">{usTax ? 'Est. tax' : 'Tax'}</dt>
                <dd className="tnum text-right">{taxCell(o)}</dd>
                <dt className="text-muted">Arrives</dt>
                <dd className={`text-right ${fastest?.id === o.id ? 'font-semibold' : ''}`}>{o.delivery.label.replace(/^Arrives /, '')}</dd>
                <dt className="text-muted">Returns</dt>
                <dd className="text-right">{o.returns?.label ?? 'Not listed'}</dd>
              </dl>
              <StoreBadges o={o} />
              <Warning o={o} />
              <div className="mt-3 flex justify-end">
                <GoButton o={o} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
