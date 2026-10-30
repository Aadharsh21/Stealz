'use client';

import type { Offer } from '@/lib/types';
import { dayFromIso, formatDay, isoFromDay } from '@/lib/dates';
import { fastestOf } from '@/lib/scoring';

/** Delivery windows per store on one day scale, so "how long will it take" is visible at a glance. */
export function DeliveryTimeline({ offers, locale }: { offers: Offer[]; locale: string }) {
  const known = offers.filter((o) => o.delivery.minDays != null && o.delivery.maxDays != null);
  const unknown = offers.filter((o) => o.delivery.minDays == null || o.delivery.maxDays == null);
  const fastest = fastestOf(offers);
  if (known.length === 0) {
    return (
      <div className="rounded-2xl p-5 ring-1 ring-line">
        <p className="text-[14px] text-ink-soft">None of the stores listed a delivery date for your location.</p>
      </div>
    );
  }
  const span = Math.max(6, ...known.map((o) => o.delivery.maxDays as number)) + 1;
  const first = known[0];
  const todayDay = (dayFromIso(first.delivery.minDate as string) ?? 0) - (first.delivery.minDays as number);
  const tickEvery = span > 12 ? 3 : span > 8 ? 2 : 1;
  const ticks = Array.from({ length: span }, (_, i) => i).filter((i) => i % tickEvery === 0);
  const rows = [...known].sort((a, b) => (a.delivery.maxDays as number) - (b.delivery.maxDays as number) || a.total - b.total);
  const pct = (d: number) => (d / span) * 100;

  return (
    <div className="rounded-2xl p-5 ring-1 ring-line">
      <div className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-x-3">
        <div />
        <div className="relative h-5 text-[11px] font-semibold text-muted" aria-hidden="true">
          {ticks.map((i) => (
            <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(i + 0.5)}%` }}>
              {i === 0 ? 'Today' : formatDay(isoFromDay(todayDay + i), locale).split(',')[0]}
            </span>
          ))}
        </div>

        {rows.map((o) => {
          const min = o.delivery.minDays as number;
          const max = o.delivery.maxDays as number;
          const isFastest = fastest?.id === o.id;
          return (
            <div key={o.id} className="contents">
              <div className="truncate py-2 text-[13px] font-semibold" title={o.store}>
                {o.store}
              </div>
              <div className="relative py-2">
                <div className="absolute inset-y-0 left-0 right-0 flex" aria-hidden="true">
                  {Array.from({ length: span }, (_, i) => (
                    <div key={i} className="h-full flex-1 border-l border-line first:border-l-0" />
                  ))}
                </div>
                <div className="relative flex h-[22px] items-center">
                  <div
                    className={`absolute h-3.5 rounded-[4px] ${isFastest ? 'bg-series' : 'bg-line-strong'}`}
                    style={{ left: `calc(${pct(min)}% + 2px)`, width: `calc(${pct(max - min + 1)}% - 4px)` }}
                  />
                  <span
                    className="absolute whitespace-nowrap pl-2 text-[12px] text-ink-soft"
                    style={
                      pct(max + 1) > 70
                        ? { right: `calc(${100 - pct(min)}% + 4px)`, paddingLeft: 0, paddingRight: 8 }
                        : { left: `${pct(max + 1)}%` }
                    }
                  >
                    {o.delivery.label.replace(/^Arrives /, '')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {unknown.length > 0 && (
        <p className="mt-3 text-[13px] text-muted">
          No date given by {unknown.map((o) => o.store).join(', ')}.
        </p>
      )}
      <p className="sr-only">
        {rows.map((o) => `${o.store}: ${o.delivery.label}.`).join(' ')}
      </p>
    </div>
  );
}
