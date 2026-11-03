import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { TagMark } from './logo';

const LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/sale', label: 'On sale' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/extension', label: 'Chrome extension' },
  { href: '/watchlist', label: 'Your watchlist' },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-canvas pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-1.5">
              <TagMark size={20} />
              <span className="text-headline">{BRAND.name}</span>
            </div>
            <p className="mt-3 text-footnote text-muted">
              {BRAND.shortPitch} Prices and delivery dates come from stores and Google Shopping and can change, so check the
              store before you buy.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="press rounded-full py-2 text-footnote font-medium text-ink-soft hover:text-ink sm:px-3">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="hairline-t mt-8 pt-5 text-caption text-muted">Covering stores in the US, the UK, the UAE and India.</p>
      </div>
    </footer>
  );
}
