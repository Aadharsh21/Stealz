'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SpinnerIcon } from './icons';
import { buttonClass } from './ui';

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [title, setTitle] = useState<string | null>(null);

  async function stop() {
    setState('working');
    try {
      const res = await fetch(`/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' });
      const body = (await res.json()) as { ok: boolean; title: string | null };
      setTitle(body.title);
      setState(body.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  }

  if (state === 'done') {
    return (
      <>
        <h1 className="type-wide text-[30px] font-extrabold tracking-[-0.03em]">Alerts stopped</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
          You won&apos;t get more emails{title ? ` about ${title}` : ''}. You can set a new alert from any product page.
        </p>
        <Link href="/" className={`${buttonClass('primary', 'lg')} mt-8`}>
          Go to Stealz
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="type-wide text-[30px] font-extrabold tracking-[-0.03em]">Stop price alerts?</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
        We&apos;ll stop emailing you about this item. Other alerts you&apos;ve set keep working.
      </p>
      {state === 'failed' && (
        <p className="mt-4 text-[14px] text-critical" role="alert">
          That link is invalid or alerts were already stopped.
        </p>
      )}
      <button type="button" onClick={stop} disabled={!token || state === 'working'} className={`${buttonClass('primary', 'lg')} mt-8`}>
        {state === 'working' && <SpinnerIcon size={16} />}
        Stop alerts
      </button>
    </>
  );
}
