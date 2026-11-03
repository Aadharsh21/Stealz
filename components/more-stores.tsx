'use client';

import { STORE_SITES } from '@/lib/store-links';
import type { CountryCode } from '@/lib/types';
import { ExternalIcon } from './icons';

/** One-tap links that run the same search on more stores' own sites. */
export function MoreStores({ country, query, id = 'more-stores' }: { country: CountryCode; query: string; id?: string }) {
  const sites = STORE_SITES[country];
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-headline">
        Search more stores
      </h2>
      <p className="mt-1 max-w-[60ch] break-words text-subhead text-muted">
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
              className="press relative inline-flex h-9 items-center gap-1.5 rounded-full bg-fill px-4 text-subhead font-semibold hover:bg-fill-strong after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
            >
              {s.name}
              <ExternalIcon size={13} strokeWidth={2.2} className="text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
