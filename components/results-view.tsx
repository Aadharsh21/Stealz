'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Sheet } from './sheet';
import { useLocation } from './location-provider';
import { MoreStores } from './more-stores';
import { ListingRow, ProductCard } from './product-card';
import { ResultsFilters } from './results-filters';
import { Notice, Segmented, Skeleton, buttonClass, chipClass } from './ui';
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
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[178px] rounded-card" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square rounded-tile" />
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
        <h1 className="text-title2">What are you shopping for?</h1>
        <p className="mt-2 text-callout text-ink-soft">Use the search box above to compare prices across stores.</p>
      </div>
    );
  }

  const hiddenParts = data
    ? [data.hiddenUsed > 0 ? `${data.hiddenUsed} used or pre-owned` : '', data.hiddenFakes > 0 ? `${data.hiddenFakes} likely fake` : ''].filter(Boolean)
    : [];
  const hiddenNote = hiddenParts.length ? `${hiddenParts.join(' and ')} listings hidden` : '';
  const shown = view === 'products' ? groups.length : listings.length;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
      {(state.status === 'loading' || state.status === 'idle') && <ResultsSkeleton />}

      {state.status === 'error' && (
        <div className="max-w-2xl">
          <h1 className="break-words text-title2">Prices for &ldquo;{query}&rdquo;</h1>
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
            <h1 className="break-words text-title2">Prices for &ldquo;{data.query}&rdquo;</h1>
            <p className="mt-2 text-callout text-ink-soft">
              {data.listings.length} new {data.listings.length === 1 ? 'listing' : 'listings'} from {data.stores.length}{' '}
              {data.stores.length === 1 ? 'store' : 'stores'}, delivered to{' '}
              <button type="button" onClick={openPicker} className="font-semibold text-ink underline decoration-line-strong decoration-1 underline-offset-[0.2em] [overflow-wrap:anywhere] hover:decoration-current">
                {data.location.label}
              </button>
              . {taxPhrase(data)}.
            </p>
            {(!data.demo || hiddenNote) && (
              <p className="mt-1 text-footnote text-muted">
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
              <h2 className="text-title3">No new listings found</h2>
              <p className="mt-2 text-callout text-ink-soft">
                Try fewer words, check the spelling, or search the brand and model, like &ldquo;Coach Tabby 26&rdquo;.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {popularSearches(data.location.country).map((q) => (
                  <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className={chipClass(false)}>
                    {q}
                  </Link>
                ))}
              </div>
              <div className="mt-12">
                <MoreStores country={data.location.country} query={data.query} />
              </div>
            </div>
          ) : (
            <>
              <div className="mt-7">
                <VerdictStrip summary={data.summary} />
                {data.summary.scope === 'all' && (
                  <p className="mt-2 text-footnote text-muted">No exact matches, so these cover all similar items.</p>
                )}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[236px_minmax(0,1fr)]">
                <aside className="hidden lg:block" aria-label="Filters">
                  <div className="sticky top-20">
                    <ResultsFilters filters={filters} onChange={setFilters} stores={data.stores} currency={data.currency} />
                  </div>
                </aside>

                <section aria-label="Results" className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                    <div className="shelf -mx-4 flex min-w-0 max-w-[calc(100%+2rem)] flex-1 items-center gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:max-w-full sm:flex-none sm:overflow-visible sm:px-0">
                    <button type="button" onClick={() => setFiltersOpen(true)} className={`${buttonClass('secondary', 'sm')} lg:hidden`}>
                      <SlidersIcon size={16} /> Filters{filterCount > 0 ? ` (${filterCount})` : ''}
                    </button>
                    <label className="flex items-center gap-2">
                      <span className="sr-only">Sort by</span>
                      <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="select">
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
                        className={
                          filters.onSale
                            ? "press relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-markdown/14 px-4 text-subhead font-semibold text-markdown after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
                            : chipClass(false)
                        }
                      >
                        <TagIcon size={15} /> On sale ({saleCount})
                      </button>
                    )}
                    </div>
                    <Segmented
                      label="View"
                      className="w-full sm:ml-auto sm:w-auto"
                      value={view}
                      onChange={setView}
                      options={[
                        { value: 'products', label: <><GridIcon size={15} /> Products</> },
                        { value: 'listings', label: <><ListIcon size={15} /> All listings</> },
                      ]}
                    />
                  </div>

                  {shown === 0 ? (
                    <div className="mt-10 rounded-card bg-canvas p-6">
                      <p className="text-headline">Nothing matches these filters.</p>
                      <p className="mt-1 text-subhead text-muted">Try widening the price or delivery range.</p>
                      <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className={`${buttonClass('primary', 'sm')} mt-4`}>
                        Clear filters
                      </button>
                    </div>
                  ) : view === 'products' ? (
                    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                      {groups.map((g) => (
                        <ProductCard key={g.key} group={g} isCheapest={cheapest != null && g.listings.some((l) => l.id === cheapest.id)} />
                      ))}
                    </div>
                  ) : (
                    <ul className="divide-hairline hairline-t mt-4">
                      {listings.map((l) => (
                        <ListingRow key={l.id} listing={l} isCheapest={cheapest?.id === l.id} />
                      ))}
                    </ul>
                  )}
                  <div className="hairline-t mt-14 pt-8">
                    <MoreStores country={data.location.country} query={data.query} />
                  </div>
                </section>
              </div>

              <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} labelledBy="filters-sheet-title" className="lg:hidden">
                <div data-sheet-handle className="flex items-center justify-between gap-3 px-5 pb-2 pt-2 sm:pt-5">
                  <h2 id="filters-sheet-title" className="text-title3">
                    Filters
                  </h2>
                  <div className="flex items-center gap-1">
                    {filterCount > 0 && (
                      <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="press rounded-full px-3 py-2 text-subhead font-semibold text-accent-ink hover:bg-fill">
                        Clear all
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="press grid h-8 w-8 place-items-center rounded-full bg-fill text-ink-soft hover:bg-fill-strong"
                      aria-label="Close filters"
                    >
                      <XIcon size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <ResultsFilters filters={filters} onChange={setFilters} stores={data.stores} currency={data.currency} showTitle={false} />
                </div>
                <div className="material-thick sticky bottom-0 px-5 pb-4 pt-3">
                  <button type="button" onClick={() => setFiltersOpen(false)} className={`${buttonClass('primary', 'lg')} w-full`}>
                    Show {shown} {shown === 1 ? 'result' : 'results'}
                  </button>
                </div>
              </Sheet>
            </>
          )}
        </>
      )}
    </div>
  );
}
