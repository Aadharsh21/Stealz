'use client';

import { useEffect, useState } from 'react';

// Development only (layout.tsx renders it when NODE_ENV is "development"). Swaps the sample
// data for a worst-case set (long names, huge prices, missing fields) or an empty one, so
// layouts can be checked against the data real stores send, not just the kind data.

const OPTIONS = [
  { value: 'demo', label: 'Demo data' },
  { value: 'worst', label: 'Worst case' },
  { value: 'empty', label: 'Empty' },
] as const;

type Variant = (typeof OPTIONS)[number]['value'];

const COOKIE = 'stealz_demo';

function readVariant(): Variant {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  const v = match?.[1];
  return v === 'worst' || v === 'empty' ? v : 'demo';
}

export function DemoDataToggle() {
  const [variant, setVariant] = useState<Variant>('demo');
  useEffect(() => setVariant(readVariant()), []);

  function choose(v: Variant) {
    document.cookie = `${COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    setVariant(v);
    window.location.reload();
  }

  return (
    <div
      role="group"
      aria-label="Sample data (development only)"
      style={{
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        gap: 2,
        padding: 3,
        borderRadius: 10,
        background: '#e5e5ea',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        font: '500 12px/1 system-ui, sans-serif',
        letterSpacing: 0,
      }}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={variant === o.value}
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            border: 0,
            cursor: 'pointer',
            background: variant === o.value ? '#ffffff' : 'transparent',
            color: '#1d1d1f',
            boxShadow: variant === o.value ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
