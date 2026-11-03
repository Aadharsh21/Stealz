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
    <div className="rounded-card bg-canvas p-5 sm:p-6">
      <h2 className="text-footnote font-semibold text-muted">Best pick for you</h2>
      {/* Re-keyed when the pick changes, so the new store blurs in instead of snapping. */}
      <div key={best.id} className="swap-in mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <StoreLogo src={best.storeLogo} name={best.store} size={22} />
            <span className="truncate text-headline">{best.store}</span>
          </div>
          <p className="mt-1.5 flex items-start gap-1.5 text-subhead text-ink-soft">
            <TruckIcon size={16} className="mt-0.5 shrink-0" /> <span className="min-w-0">{best.delivery.label}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Money amount={best.total} currency={best.currency} className="price block text-[2.25rem] leading-none" />
          <span className="text-caption text-muted">{best.totalIsComplete ? 'total' : 'plus shipping'}</span>
        </div>
      </div>
      <p className="mt-3 text-subhead text-ink-soft" aria-live="polite">
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
          className="range"
          style={{ '--pct': `${weight}%` } as React.CSSProperties}
          aria-valuetext={weight < 34 ? 'Mostly price' : weight > 66 ? 'Mostly speed' : 'Balanced'}
        />
        <div className="mt-0.5 flex justify-between text-caption font-semibold text-muted">
          <span>Cheapest</span>
          <span>Fastest</span>
        </div>
      </div>

      {best.link && (
        <a
          href={best.link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="press mt-5 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-headline text-paper hover:bg-ink/85"
        >
          <span className="truncate">{best.store.length > 18 ? (best.linkIsSearch ? 'Find it at this store' : 'Go to store') : best.linkIsSearch ? `Find it at ${best.store}` : `Go to ${best.store}`}</span>
          <ExternalIcon size={16} strokeWidth={2.2} className="shrink-0" />
        </a>
      )}
      {cheapest && cheapest.id !== best.id && (
        <p className="mt-3 text-center text-footnote text-muted">
          Cheapest is {cheapest.store} at {formatMoney(cheapest.total, cheapest.currency)}
        </p>
      )}
    </div>
  );
}
