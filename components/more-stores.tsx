'use client';

import { STORE_SITES } from '@/lib/store-links';
import type { CountryCode } from '@/lib/types';
import { ExternalIcon } from './icons';

/** One-tap links that run the same search on more stores' own sites. */
export function MoreStores({ country, query, id = 'more-stores' }: { country: CountryCode; query: string; id?: string }) {
  const sites = STORE_SITES[country];
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-[16px] font-bold">
        Search more stores
      </h2>
      <p className="mt-1 max-w-[60ch] text-[14px] text-muted">
        Not every store lists everything on Google Shopping. Each of these opens &ldquo;{query}&rdquo; on the store&apos;s own site.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {sites.map((s) => (
          <li key={s.name}>
            <a
              href={s.search(query)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={s.viaGoogle ? `${s.blurb}. Opens a Google search of ${s.name}` : s.blurb}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-semibold ring-1 ring-line-strong transition-colors hover:bg-canvas"
            >
              {s.name}
              <ExternalIcon size={14} className="text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
