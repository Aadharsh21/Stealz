import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export function TagMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g transform="rotate(-12 16 16)">
        <path
          d="M10 4h12a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
          fill="var(--sticker)"
          stroke="var(--ink)"
          strokeWidth="2.2"
        />
        <circle cx="16" cy="9.5" r="2" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="M12 17h8M12 21.5h5" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 rounded-lg" aria-label={`${BRAND.name} home`}>
      <TagMark />
      <span className="type-wide text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink">{BRAND.name}</span>
    </Link>
  );
}
