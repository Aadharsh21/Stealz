'use client';

import { useId, useState } from 'react';
import type { ProductResponse } from '@/lib/types';
import { ApiClientError, browserTimeZone, postJson } from '@/lib/client';
import { currencySymbol, formatMoney } from '@/lib/money';
import { cheapestOf } from '@/lib/scoring';
import { BellIcon, CheckIcon, SpinnerIcon } from './icons';
import { Notice, buttonClass } from './ui';

type Mode = 'any' | 'target';

export function TrackPrice({ data, encodedRef, onSaveToWatchlist, watched }: {
  data: ProductResponse;
  encodedRef: string;
  onSaveToWatchlist: () => void;
  watched: boolean;
}) {
  const best = cheapestOf(data.offers);
  const current = best?.total ?? 0;
  const suggested = Math.floor(current * 0.9);
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<Mode>('target');
  const [target, setTarget] = useState(String(suggested));
  const [state, setState] = useState<{ status: 'idle' | 'sending' } | { status: 'done' | 'error'; message: string }>({ status: 'idle' });
  const id = useId();

  if (!data.alertsEnabled) {
    return (
      <div className="space-y-3">
        <Notice icon={<BellIcon />}>
          {data.demo
            ? 'Email price alerts switch on once the site is connected to live prices, a database and an email service.'
            : "Email price alerts aren't switched on for this site yet."}{' '}
          You can still save this item to your watchlist on this device and check back.
        </Notice>
        <button type="button" onClick={onSaveToWatchlist} className={buttonClass(watched ? 'secondary' : 'primary')}>
          {watched ? 'Saved to your watchlist' : 'Save to watchlist'}
        </button>
      </div>
    );
  }

  if (state.status === 'done') {
    return (
      <Notice icon={<CheckIcon />}>
        <p className="font-semibold text-ink">{state.message}</p>
        <p className="mt-1">We check prices every day. Every email has a link to stop alerts.</p>
      </Notice>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const targetPrice = mode === 'target' ? Number(target.replace(/[^\d.]/g, '')) : null;
    if (mode === 'target' && (!targetPrice || targetPrice >= current)) {
      setState({ status: 'error', message: `Pick a target below today's ${formatMoney(current, data.currency)}.` });
      return;
    }
    setState({ status: 'sending' });
    try {
      const res = await postJson<{ status: string; message: string }>('/api/alerts', {
        ref: encodedRef,
        email,
        targetPrice,
        currentLow: current,
        currency: data.currency,
        image: data.product.images[0],
        location: data.location,
        tz: browserTimeZone(),
      });
      setState({ status: 'done', message: res.message });
    } catch (err) {
      setState({ status: 'error', message: err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.' });
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl p-5 ring-1 ring-line">
      <fieldset>
        <legend className="text-[14px] font-semibold">Email me when</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name={`${id}-mode`} checked={mode === 'target'} onChange={() => setMode('target')} className="h-4 w-4 accent-[var(--ink)]" />
            The total drops to
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name={`${id}-mode`} checked={mode === 'any'} onChange={() => setMode('any')} className="h-4 w-4 accent-[var(--ink)]" />
            Any price drop
          </label>
        </div>
      </fieldset>
      <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
        {mode === 'target' && (
          <label className="flex h-11 items-center rounded-xl px-3 ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-focus">
            <span className="text-muted">{currencySymbol(data.currency)}</span>
            <input
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Target total price"
              className="w-full bg-transparent px-2 text-[15px] focus:outline-none"
            />
          </label>
        )}
        <label className={`flex h-11 items-center rounded-xl px-3 ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-focus ${mode === 'any' ? 'sm:col-span-2' : ''}`}>
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
          />
        </label>
        <button type="submit" disabled={state.status === 'sending'} className={`${buttonClass('primary', 'lg')} h-11`}>
          {state.status === 'sending' ? <SpinnerIcon size={16} /> : <BellIcon size={16} />}
          Set alert
        </button>
      </div>
      {state.status === 'error' && (
        <p className="mt-3 text-[14px] text-critical" role="alert">
          {state.message}
        </p>
      )}
      <p className="mt-3 text-[13px] text-muted">
        Today&apos;s lowest total is {formatMoney(current, data.currency)}. We&apos;ll send one email to confirm, and every alert
        has a one-click unsubscribe. No account needed.
      </p>
    </form>
  );
}
