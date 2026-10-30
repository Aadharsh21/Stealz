import type { CountryCode } from '@/lib/types';

/** Small flags drawn as SVG (emoji flags don't render on Windows). */
export function Flag({ country, className = '' }: { country: CountryCode; className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      width="22"
      height="15"
      className={`shrink-0 rounded-[3px] ring-1 ring-black/10 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {country === 'US' && (
        <>
          <rect width="30" height="20" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#b31942" />
          ))}
          <rect width="13" height={(20 / 13) * 7} fill="#0a3161" />
          {[2.5, 6.5, 10.5].map((x) =>
            [2.2, 5.4, 8.6].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="#fff" />),
          )}
        </>
      )}
      {country === 'GB' && (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#c8102e" strokeWidth="1.3" />
          <rect x="12.5" width="5" height="20" fill="#fff" />
          <rect y="7" width="30" height="6" fill="#fff" />
          <rect x="13.5" width="3" height="20" fill="#c8102e" />
          <rect y="8.2" width="30" height="3.6" fill="#c8102e" />
        </>
      )}
      {country === 'AE' && (
        <>
          <rect width="30" height="6.67" fill="#00732f" />
          <rect y="6.67" width="30" height="6.67" fill="#fff" />
          <rect y="13.33" width="30" height="6.67" fill="#000" />
          <rect width="7.5" height="20" fill="#ff0000" />
        </>
      )}
      {country === 'IN' && (
        <>
          <rect width="30" height="6.67" fill="#ff9933" />
          <rect y="6.67" width="30" height="6.67" fill="#fff" />
          <rect y="13.33" width="30" height="6.67" fill="#138808" />
          <circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth="0.7" />
          <circle cx="15" cy="10" r="0.6" fill="#000080" />
        </>
      )}
    </svg>
  );
}
