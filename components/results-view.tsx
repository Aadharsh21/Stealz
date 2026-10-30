'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { SearchResponse } from '@/lib/types';
import { ApiClientError, getJson, locationParams, timeAgo } from '@/lib/client';
import { COUNTRIES } from '@/lib/countries';
import type { ResultFilters, SortKey } from '@/lib/filters';
import { DEFAULT_FILTERS, SORT_LABELS, activeFilterCount, cheapestListing, filterGroups, filterListings } from '@/lib/filters';
import { addRecentSearch } from '@/lib/storage';
import { popularSearches } from '@/lib/suggestions';
import { AlertIcon, GridIcon, InfoIcon, ListIcon, SlidersIcon, TagIcon, XIcon } from './icons';
import { useLocation } from './location-provider';
import { MoreStores } from './more-stores';
import { ListingRow, ProductCard } from './product-card';
import { ResultsFilters } from './results-filters';
import { Notice, Skeleton, buttonClass } from './ui';
import { VerdictStrip } from './verdict-strip';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string; code: string }
  | { status: 'ready'; data: SearchResponse };

function taxPhrase(data: SearchResponse): string {
  const loc = data.location;
  if (loc.country === 'GB') return 'Totals include delivery fees and VAT';
  if (loc.country === 'AE') return 'Totals include delivery fees and 5% VAT';
  if (loc.country === 'IN') return 'Totals include delivery charges and GST';
  if (!loc.regionCode) return 'Totals include shipping but not sales tax. Set your ZIP code to add it';
  return 'Totals include shipping and estimated sales tax';
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading prices">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[170px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="mt-3 h-4 w-4/5" />
            <Skeleton className="mt-2 h-6 w-1/2" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        Checking stores for prices…
      </p>
    </div>
  );
}

export function ResultsView() {
  const params = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const { location, ready, openPicker } = useLocation();
  const [state, setState] = useState<State>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [view, setView] = useState<'products' | 'listings'>('products');
  const filterDialog = useRef<HTMLDialogElement>(null);

  const locationKey = location ? `${location.country}|${location.postalCode ?? ''}|${location.city ?? ''}|${location.regionCode ?? ''}` : '';

  useEffect(() => {
    if (!query || !ready || !location) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    setFilters(DEFAULT_FILTERS);
    addRecentSearch(query);
    const p = locationParams(location);
    p.set('q', query);
    getJson<SearchResponse>(`/api/search?${p}`, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        const e = err instanceof ApiClientError ? err : new ApiClientError(err.message, 0, 'server');
        setState({ status: 'error', message: e.message, code: e.code });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ready, locationKey, attempt]);

  useEffect(() => {
    document.title = query ? `${query} prices | Stealz` : 'Search | Stealz';
  }, [query]);

  const data = state.status === 'ready' ? state.data : null;
  const groups = useMemo(() => (data ? filterGroups(data.groups, filters, sort) : []), [data, filters, sort]);
  const listings = useMemo(() => (data ? filterListings(data.listings, filters, sort) : []), [data, filters, sort]);
  const cheapest = useMemo(() => cheapestListing(groups, data?.summary.scope), [groups, data?.summary.scope]);
  const filterCount = activeFilterCount(filters);
  const saleCount = useMemo(() => (data ? data.groups.filter((g) => g.onSale).length : 0), [data]);

  if (!query) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="type-wide text-[28px] font-extrabold tracking-[-0.03em]">What are you shopping for?</h1>
        <p className="mt-2 text-ink-soft">Use the search box above to compare prices across stores.</p>
      </div>
    );
  }

  const hiddenParts = data
    ? [data.hiddenUsed > 0 ? `${data.hiddenUsed} used or pre-owned` : '', data.hiddenFakes > 0 ? `${data.hiddenFakes} likely fake` : ''].filter(Boolean)
    : [];
  const hiddenNote = hiddenParts.length ? `${hiddenParts.join(' and ')} listings hidden` : '';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
      {(state.status === 'loading' || state.status === 'idle') && <ResultsSkeleton />}

      {state.status === 'error' && (
        <div className="max-w-2xl">
          <h1 className="type-wide text-[26px] font-extrabold tracking-[-0.03em]">Prices for &ldquo;{query}&rdquo;</h1>
          <div className="mt-6">
            <Notice tone={state.code === 'rate_limited' || state.code === 'budget' ? 'warn' : 'error'} icon={<AlertIcon />}>
              <p>{state.message}</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className={`${buttonClass('secondary', 'sm')} mt-3`}>
                Try again
              </button>
            </Notice>
          </div>
        </div>
      )}

      {data && (
        <>
          <header>
            <h1 className="type-wide text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">
              Prices for &ldquo;{data.query}&rdquo;
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft">
              {data.listings.length} new listings from {data.stores.length} stores, delivered to{' '}
              <button type="button" onClick={openPicker} className="font-semibold text-ink underline underline-offset-2">
                {data.location.label}
              </button>
              . {taxPhrase(data)}.
            </p>
            {(!data.demo || hiddenNote) && (
              <p className="mt-1 text-[13px] text-muted">
                {data.demo
                  ? hiddenNote
                  : `Checked ${timeAgo(data.fetchedAt)} from ${data.sources.join(' and ') || COUNTRIES[data.location.country].name}${
                      hiddenNote ? `. ${hiddenNote}` : ''
                    }`}
              </p>
            )}
          </header>

          {data.demo && (
            <div className="mt-5">
              <Notice icon={<InfoIcon />}>
                You&apos;re looking at sample data. Live prices from real stores appear once the site&apos;s SerpApi key is
                added.
              </Notice>
            </div>
          )}
          {data.notices.map((n) => (
            <div key={n} className="mt-3">
              <Notice tone="warn" icon={<InfoIcon />}>
                {n}
              </Notice>
            </div>
          ))}

          {data.listings.length === 0 ? (
            <div className="mt-10 max-w-xl">
              <h2 className="text-[18px] font-bold">No new listings found</h2>
              <p className="mt-2 text-ink-soft">
                Try fewer words, check the spelling, or search the brand and model, like &ldquo;Coach Tabby 26&rdquo;.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularSearches(data.location.country).map((q) => (
                  <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="rounded-full bg-canvas px-3 py-1.5 text-[14px] ring-1 ring-line hover:bg-paper">
                    {q}
                  </Link>
                ))}
              </div>
              <div className="mt-10">
                <MoreStores country={data.location.country} query={data.query} />
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <VerdictStrip summary={data.summary} />
                {data.summary.scope === 'all' && (
                  <p className="mt-2 text-[13px] text-muted">No exact matches, so these cover all similar items.</p>
                )}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[232px_1fr]">
                <aside className="hidden lg:block" aria-label="Filters">
                  <div className="sticky top-24">
                    <ResultsFilters filters={filters} onChange={setFilters} stores={data.stores} currency={data.currency} />
                  </div>
                </aside>

                <section aria-label="Results">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => filterDialog.current?.showModal()}
                      className={`${buttonClass('secondary', 'sm')} lg:hidden`}
                    >
                      <SlidersIcon size={16} /> Filters{filterCount > 0 ? ` (${filterCount})` : ''}
                    </button>
                    <label className="flex items-center gap-2 text-[14px]">
                      <span className="text-muted">Sort by</span>
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                        className="h-8 rounded-full bg-paper px-3 text-[13px] font-semibold ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-focus"
                      >
                        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                          <option key={k} value={k}>
                            {SORT_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {saleCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, onSale: !f.onSale }))}
                        aria-pressed={filters.onSale}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 transition-colors ${
                          filters.onSale ? 'bg-markdown/15 text-markdown ring-markdown/50' : 'text-ink-soft ring-line-strong hover:bg-canvas'
                        }`}
                      >
                        <TagIcon size={14} /> On sale ({saleCount})
                      </button>
                    )}
                    <div className="ml-auto inline-flex rounded-full p-0.5 ring-1 ring-line-strong" role="group" aria-label="View">
                      <button
                        type="button"
                        onClick={() => setView('products')}
                        aria-pressed={view === 'products'}
                        className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${view === 'products' ? 'bg-ink text-paper' : 'text-ink-soft'}`}
                      >
                        <GridIcon size={14} /> Products
                      </button>
                      <button
                        type="button"
                        onClick={() => setView('listings')}
                        aria-pressed={view === 'listings'}
                        className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${view === 'listings' ? 'bg-ink text-paper' : 'text-ink-soft'}`}
                      >
                        <ListIcon size={14} /> All listings
                      </button>
                    </div>
                  </div>

                  {(view === 'products' ? groups.length : listings.length) === 0 ? (
                    <div className="mt-10">
                      <p className="font-semibold">Nothing matches these filters.</p>
                      <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className={`${buttonClass('secondary', 'sm')} mt-3`}>
                        Clear filters
                      </button>
                    </div>
                  ) : view === 'products' ? (
                    <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
                      {groups.map((g) => (
                        <ProductCard key={g.key} group={g} isCheapest={cheapest != null && g.listings.some((l) => l.id === cheapest.id)} />
                      ))}
                    </div>
                  ) : (
                    <ul className="mt-4 border-t border-line">
                      {listings.map((l) => (
                        <ListingRow key={l.id} listing={l} isCheapest={cheapest?.id === l.id} />
                      ))}
                    </ul>
                  )}
                  <div className="mt-14 border-t border-line pt-8">
                    <MoreStores country={data.location.country} query={data.query} />
                  </div>
                </section>
              </div>

              <dialog
                ref={filterDialog}
                onClick={(e) => {
                  if (e.target === filterDialog.current) filterDialog.current?.close();
                }}
                className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-paper p-0 text-ink backdrop:bg-black/70 lg:hidden"
                aria-label="Filters"
              >
                <div className="p-5">
                  <div className="mb-2 flex justify-end">
                    <button type="button" onClick={() => filterDialog.current?.close()} className={buttonClass('ghost', 'sm')} aria-label="Close filters">
                      <XIcon />
                    </button>
                  </div>
                  <ResultsFilters filters={filters} onChange={setFilters} stores={data.stores} currency={data.currency} />
                  <button type="button" onClick={() => filterDialog.current?.close()} className={`${buttonClass('primary', 'lg')} mt-6 w-full`}>
                    Show {view === 'products' ? groups.length : listings.length} results
                  </button>
                </div>
              </dialog>
            </>
          )}
        </>
      )}
    </div>
  );
}
