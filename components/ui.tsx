'use client';

import { useState } from 'react';
import type { CurrencyCode } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { StarIcon } from './icons';

export function Money({
  amount,
  currency,
  className = '',
  tabular = false,
}: {
  amount: number;
  currency: CurrencyCode;
  className?: string;
  tabular?: boolean;
}) {
  return <span className={`${tabular ? 'tnum' : ''} ${className}`}>{formatMoney(amount, currency)}</span>;
}

/** A "was" price, struck through quietly. */
export function WasPrice({ amount, currency, className = '' }: { amount: number; currency: CurrencyCode; className?: string }) {
  return (
    <span className={`was ${className}`}>
      <span className="sr-only">Was </span>
      {formatMoney(amount, currency)}
    </span>
  );
}

export function StoreLogo({ src, name, size = 20 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from(name.replace(/^ebay · /i, 'e').trim())[0]?.toUpperCase() || '?';
  if (!src || failed) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full bg-fill-strong font-semibold text-ink-soft"
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.5)) }}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="edge shrink-0 rounded-full bg-white"
      style={{ width: size, height: size }}
    />
  );
}

export function Stars({ rating, reviews, compact = false }: { rating?: number; reviews?: number; compact?: boolean }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-footnote text-muted">
      <StarIcon size={13} className="text-ink-soft" />
      <span className="tnum font-medium text-ink-soft">{rating.toFixed(1)}</span>
      {reviews != null && !compact && <span className="tnum">({reviews.toLocaleString('en-US')})</span>}
      <span className="sr-only"> out of 5 stars</span>
    </span>
  );
}

type BadgeTone = 'neutral' | 'sale' | 'good' | 'warn' | 'info';

const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-fill text-ink-soft',
  sale: 'bg-markdown/12 text-markdown',
  good: 'bg-good/14 text-good',
  warn: 'bg-warning/14 text-warning',
  info: 'bg-sticker/20 text-accent-ink',
};

/** A small tinted capsule: one fact about a listing. */
export function Badge({ tone = 'neutral', children, className = '' }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-footnote font-semibold leading-none ${BADGE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** The gold tag. Use it for one thing per view: the best price. */
export function Sticker({ children, animate = false, className = '' }: { children: React.ReactNode; animate?: boolean; className?: string }) {
  return (
    <span
      className={`sticker ${animate ? 'sticker-in' : ''} inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-footnote font-semibold leading-none ${className}`}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Notice({
  children,
  tone = 'info',
  icon,
}: {
  children: React.ReactNode;
  tone?: 'info' | 'warn' | 'error';
  icon?: React.ReactNode;
}) {
  const iconColor = tone === 'error' ? 'text-critical' : tone === 'warn' ? 'text-warning' : 'text-ink-soft';
  return (
    <div
      className="flex items-start gap-3 rounded-tile bg-canvas px-4 py-3.5 text-subhead text-ink-soft"
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {icon && <span className={`mt-0.5 shrink-0 ${iconColor}`}>{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export { buttonClass, chipClass } from './classes';
export type { ButtonSize, ButtonVariant } from './classes';

/** Apple's segmented control: equal segments, the selected one marked by a thumb that slides. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
  pad = 'px-3',
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
  /** Horizontal padding inside each segment. */
  pad?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="group" aria-label={label} className={`segmented ${className}`}>
      <span
        aria-hidden="true"
        className="segmented-thumb"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className={`relative inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.5625rem] ${pad} font-semibold transition-colors duration-200 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] ${
              size === 'sm' ? 'h-8 text-footnote' : 'h-9 text-subhead'
            } ${selected ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
