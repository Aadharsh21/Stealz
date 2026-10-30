'use client';

import type { DealScore } from '@/lib/types';
import { CheckIcon, InfoIcon } from './icons';

const SEGMENTS = [
  { from: 0, to: 45, label: 'Wait', className: 'bg-critical/25' },
  { from: 45, to: 62, label: 'Fair', className: 'bg-warning/30' },
  { from: 62, to: 80, label: 'Good', className: 'bg-good/25' },
  { from: 80, to: 100, label: 'Great', className: 'bg-good/45' },
];

export function DealScoreCard({ deal }: { deal: DealScore | null }) {
  if (!deal) {
    return (
      <div className="rounded-2xl p-5 ring-1 ring-line">
        <h3 className="text-[13px] font-semibold text-muted">Deal score</h3>
        <p className="mt-2 text-[15px] font-semibold">Not enough to compare yet</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
          Only one store sells this right now and we have no price history for it. Set an alert below and we&apos;ll keep
          watching.
        </p>
      </div>
    );
  }
  const markerLeft = `${Math.min(98.5, Math.max(1.5, deal.score))}%`;
  return (
    <div className="rounded-2xl p-5 ring-1 ring-line">
      <h3 className="text-[13px] font-semibold text-muted">Deal score</h3>
      <div className="mt-2 flex items-end gap-3">
        <span className="type-cond text-[56px] font-extrabold leading-[0.85]">{deal.score}</span>
        <div className="pb-1">
          <p className="text-[18px] font-bold leading-tight">{deal.label}</p>
          <p className="text-[12px] text-muted">out of 100</p>
        </div>
      </div>

      <div className="mt-4" role="img" aria-label={`Deal score ${deal.score} out of 100: ${deal.label}`}>
        <div className="relative flex h-2.5 gap-[2px]">
          {SEGMENTS.map((s) => (
            <div key={s.label} className={`h-full first:rounded-l-full last:rounded-r-full ${s.className}`} style={{ width: `${s.to - s.from}%` }} />
          ))}
          <span className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-paper" style={{ left: markerLeft }} />
        </div>
        <div className="mt-1.5 flex text-[11px] font-semibold text-muted">
          {SEGMENTS.map((s) => (
            <span key={s.label} style={{ width: `${s.to - s.from}%` }}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[15px] font-semibold">{deal.advice}</p>
      <ul className="mt-2 space-y-1.5">
        {deal.reasons.map((r) => (
          <li key={r} className="flex gap-2 text-[14px] leading-snug text-ink-soft">
            <CheckIcon size={16} className="mt-0.5 shrink-0 text-ink" />
            {r}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex gap-1.5 text-[12px] leading-snug text-muted">
        <InfoIcon size={14} className="mt-px shrink-0" />
        {deal.basis === 'history'
          ? 'Based on the price history we track and what other stores charge today.'
          : 'Based on what stores charge today. It gets sharper as we build up price history.'}
      </p>
    </div>
  );
}
