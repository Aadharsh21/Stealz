import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { TagMark } from './logo';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <TagMark size={22} />
            <span className="type-wide text-[17px] font-extrabold tracking-[-0.03em]">{BRAND.name}</span>
          </div>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">
            {BRAND.shortPitch} Prices and delivery dates come from stores and Google Shopping and can change, so
            check the store before you buy.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-[14px] md:justify-end">
          <Link href="/how-it-works" className="font-medium text-ink-soft hover:text-ink">
            How it works
          </Link>
          <Link href="/watchlist" className="font-medium text-ink-soft hover:text-ink">
            Your watchlist
          </Link>
          <span className="text-muted">US, UAE and India</span>
        </nav>
      </div>
    </footer>
  );
}
