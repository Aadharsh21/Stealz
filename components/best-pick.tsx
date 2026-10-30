'use client';

import { useId, useMemo, useState } from 'react';
import type { Offer } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { DEFAULT_SPEED_WEIGHT, cheapestOf, explainPick, fastestOf, rankOffers } from '@/lib/scoring';
import { ExternalIcon, TruckIcon } from './icons';
import { Money, StoreLogo } from './ui';

/** The recommended store, with a slider for how much the shopper cares about speed vs price. */
export function BestPick({ offers }: { offers: Offer[] }) {
  const [weight, setWeight] = useState(Math.round(DEFAULT_SPEED_WEIGHT * 100));
  const sliderId = useId();
  const ranked = useMemo(() => rankOffers(offers, weight / 100), [offers, weight]);
  const best = ranked[0]?.offer;
  const cheapest = cheapestOf(offers);
  const fastest = fastestOf(offers);
  if (!best) return null;
  const reason = explainPick(best, cheapest, fastest);

  return (
    <div className="rounded-2xl p-5 ring-1 ring-line">
      <h2 className="text-[13px] font-semibold text-muted">Best pick for you</h2>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StoreLogo src={best.storeLogo} name={best.store} size={22} />
            <span className="truncate text-[17px] font-bold">{best.store}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink-soft">
            <TruckIcon size={16} className="shrink-0" /> {best.delivery.label}
          </p>
        </div>
        <div className="text-right">
          <Money amount={best.total} currency={best.currency} className="type-cond block text-[34px] font-extrabold leading-none" />
          <span className="text-[12px] text-muted">{best.totalIsComplete ? 'total' : 'plus shipping'}</span>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-soft" aria-live="polite">
        {reason}
      </p>

      <div className="mt-4">
        <label htmlFor={sliderId} className="sr-only">
          Balance between lowest price and fastest delivery
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={5}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-full cursor-pointer accent-[var(--ink)]"
          aria-valuetext={weight < 34 ? 'Mostly price' : weight > 66 ? 'Mostly speed' : 'Balanced'}
        />
        <div className="flex justify-between text-[12px] font-semibold text-muted">
          <span>Cheapest</span>
          <span>Fastest</span>
        </div>
      </div>

      {best.link && (
        <a
          href={best.link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-paper hover:bg-ink-soft"
        >
          {best.linkIsSearch ? `Find it at ${best.store}` : `Go to ${best.store}`} <ExternalIcon size={16} />
        </a>
      )}
      {cheapest && cheapest.id !== best.id && (
        <p className="mt-3 text-center text-[13px] text-muted">
          Cheapest is {cheapest.store} at {formatMoney(cheapest.total, cheapest.currency)}
        </p>
      )}
    </div>
  );
}
