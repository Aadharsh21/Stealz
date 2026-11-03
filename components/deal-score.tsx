'use client';

import type { DealScore } from '@/lib/types';
import { CheckIcon, InfoIcon } from './icons';

const LABELS = [
  { from: 0, label: 'Wait' },
  { from: 45, label: 'Fair' },
  { from: 62, label: 'Good' },
  { from: 80, label: 'Great' },
];

export function DealScoreCard({ deal }: { deal: DealScore | null }) {
  if (!deal) {
    return (
      <div className="h-full rounded-card bg-canvas p-5 sm:p-6">
        <h3 className="text-footnote font-semibold text-muted">Deal score</h3>
        <p className="mt-2 text-headline">Not enough to compare yet</p>
        <p className="mt-1 text-subhead text-ink-soft">
          Only one store sells this right now and we have no price history for it. Set an alert below and we&apos;ll keep
          watching.
        </p>
      </div>
    );
  }
  const markerLeft = `${Math.min(98, Math.max(2, deal.score))}%`;
  return (
    <div className="h-full rounded-card bg-canvas p-5 sm:p-6">
      <h3 className="text-footnote font-semibold text-muted">Deal score</h3>
      <div className="mt-2 flex items-end gap-3">
        <span className="price text-[3.5rem] leading-[0.85]">{deal.score}</span>
        <div className="pb-0.5">
          <p className="text-headline">{deal.label}</p>
          <p className="text-caption text-muted">out of 100</p>
        </div>
      </div>

      {/* A gauge like the Weather app's: one continuous scale with a knob at today's score. */}
      <div className="mt-5" role="img" aria-label={`Deal score ${deal.score} out of 100: ${deal.label}`}>
        <div className="relative h-1.5 rounded-full bg-[linear-gradient(90deg,var(--critical)_0%,var(--warning)_45%,var(--good)_72%,var(--good)_100%)] opacity-90">
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--knob)] shadow-[0_1px_4px_rgba(0,0,0,0.3)] ring-[3px] ring-canvas"
            style={{ left: markerLeft }}
          />
        </div>
        <div className="relative mt-2 h-4 text-caption font-semibold text-muted">
          {LABELS.map((l) => (
            <span key={l.label} className="absolute" style={{ left: `${l.from}%` }}>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-headline">{deal.advice}</p>
      <ul className="mt-2 space-y-1.5">
        {deal.reasons.map((r) => (
          <li key={r} className="flex gap-2 text-subhead text-ink-soft">
            <CheckIcon size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-good" />
            {r}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex gap-1.5 text-footnote text-muted">
        <InfoIcon size={14} className="mt-0.5 shrink-0" />
        {deal.basis === 'history'
          ? 'Based on the price history we track and what other stores charge today.'
          : 'Based on what stores charge today. It gets sharper as we build up price history.'}
      </p>
    </div>
  );
}
