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

/** A "was" price crossed out like a hand-marked clearance tag. */
export function WasPrice({ amount, currency, className = '' }: { amount: number; currency: CurrencyCode; className?: string }) {
  return (
    <span className={`markdown ${className}`}>
      <span className="sr-only">Was </span>
      {formatMoney(amount, currency)}
    </span>
  );
}

export function StoreLogo({ src, name, size = 20 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = name.replace(/^ebay · /i, 'e').trim().charAt(0).toUpperCase() || '?';
  if (!src || failed) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full bg-canvas text-[10px] font-bold text-ink-soft ring-1 ring-line"
        style={{ width: size, height: size }}
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
      className="shrink-0 rounded-full bg-white ring-1 ring-line"
      style={{ width: size, height: size }}
    />
  );
}

export function Stars({ rating, reviews, compact = false }: { rating?: number; reviews?: number; compact?: boolean }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-muted">
      <StarIcon size={13} className="text-ink" />
      <span className="font-medium text-ink-soft">{rating.toFixed(1)}</span>
      {reviews != null && !compact && <span>({reviews.toLocaleString('en-US')})</span>}
      <span className="sr-only"> out of 5 stars</span>
    </span>
  );
}

type BadgeTone = 'neutral' | 'sale' | 'good' | 'warn' | 'info';

const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-canvas text-ink-soft ring-line',
  sale: 'bg-transparent text-markdown ring-markdown/40',
  good: 'bg-transparent text-good ring-good/40',
  warn: 'bg-transparent text-warning ring-warning/50',
  info: 'bg-transparent text-series ring-series/40',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ${BADGE[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** The clearance sticker. Use it for one thing per view: the best price. */
export function Sticker({ children, animate = false, className = '' }: { children: React.ReactNode; animate?: boolean; className?: string }) {
  return (
    <span className={`sticker ${animate ? 'sticker-in' : ''} inline-flex items-center rounded-[6px] px-2 py-1 text-[12px] font-extrabold leading-none ${className}`}>
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
  const ring = tone === 'error' ? 'ring-critical/40' : tone === 'warn' ? 'ring-warning/50' : 'ring-line';
  return (
    <div className={`flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 text-[14px] leading-relaxed text-ink-soft ring-1 ${ring}`} role={tone === 'error' ? 'alert' : 'status'}>
      {icon && <span className="mt-0.5 shrink-0 text-ink">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function buttonClass(variant: 'primary' | 'secondary' | 'ghost' | 'sticker' = 'primary', size: 'sm' | 'md' | 'lg' = 'md'): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-[14px]', lg: 'h-12 px-6 text-[15px]' };
  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-soft',
    secondary: 'bg-paper text-ink ring-1 ring-line-strong hover:bg-canvas',
    ghost: 'text-ink hover:bg-canvas',
    sticker: 'bg-sticker text-sticker-ink hover:brightness-95',
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
}
