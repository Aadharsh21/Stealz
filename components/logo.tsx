import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/** A jeweler's string tag in fine champagne line. */
export function TagMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="shrink-0">
      <path d="M16 3.5c-3 0-4.6 2.4-3.6 5.2" fill="none" stroke="var(--sticker)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M11.5 10.5 16 7l4.5 3.5V27a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5z"
        fill="none"
        stroke="var(--sticker)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="11.6" r="1.5" fill="var(--sticker)" />
      <path d="M14 18h4M14.6 21.5h2.8" stroke="var(--sticker)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="press inline-flex shrink-0 items-center gap-1.5 rounded-full py-2 pr-1" aria-label={`${BRAND.name} home`}>
      <TagMark />
      <span className="text-[1.3125rem] font-semibold leading-none tracking-[-0.035em] text-ink">{BRAND.name}</span>
    </Link>
  );
}
