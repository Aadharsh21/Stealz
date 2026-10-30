'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ProductResponse } from '@/lib/types';
import { ApiClientError, getJson, locationParams, timeAgo } from '@/lib/client';
import { COUNTRIES } from '@/lib/countries';
import { formatMoney } from '@/lib/money';
import { productHref } from '@/lib/ref';
import { cheapestOf } from '@/lib/scoring';
import { isWatched, toggleWatch, updateWatchPrice } from '@/lib/storage';
import { BestPick } from './best-pick';
import { DealScoreCard } from './deal-score';
import { DeliveryTimeline } from './delivery-timeline';
import { AlertIcon, BookmarkIcon, CheckIcon, ChevronLeftIcon, InfoIcon, ShareIcon, TruckIcon } from './icons';
import { useLocation } from './location-provider';
import { OfferTable } from './offer-table';
import { PriceHistory } from './price-history';
import { ProductImage } from './product-card';
import { TrackPrice } from './track-price';
import { Money, Notice, Skeleton, Stars, buttonClass } from './ui';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string }
  | { status: 'ready'; data: ProductResponse };

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const list = images.length ? images : [''];
  return (
    <div>
      <ProductImage src={list[index] || undefined} alt={title} className="aspect-square" />
      {list.length > 1 && (
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto p-1 scrollbar-none">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === index}
              className={`shrink-0 rounded-xl ring-2 ${i === index ? 'ring-ink' : 'ring-transparent hover:ring-line-strong'}`}
            >
              <ProductImage src={src} alt="" className="h-16 w-16" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // share sheet dismissed
    }
  }
  return (
    <button type="button" onClick={share} className={buttonClass('secondary')}>
      {copied ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy="true">
      <Skeleton className="aspect-square rounded-xl" />
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-9 w-4/5" />
        <Skeleton className="mt-3 h-5 w-2/3" />
        <Skeleton className="mt-8 h-56 rounded-2xl" />
      </div>
      <p className="sr-only" role="status">
        Comparing stores…
      </p>
    </div>
  );
}

export function ProductView() {
  const params = useSearchParams();
  const encodedRef = params.get('ref') ?? '';
  const { location, ready, openPicker } = useLocation();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [watched, setWatched] = useState(false);
  const locationKey = location ? `${location.country}|${location.postalCode ?? ''}|${location.city ?? ''}|${location.regionCode ?? ''}` : '';

  useEffect(() => {
    if (!encodedRef || !ready || !location) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    const p = locationParams(location);
    p.set('ref', encodedRef);
    getJson<ProductResponse>(`/api/product?${p}`, controller.signal)
      .then((data) => {
        setState({ status: 'ready', data });
        setWatched(isWatched(data.ref.k));
        const best = cheapestOf(data.offers);
        if (best) updateWatchPrice(data.ref.k, best.total);
        document.title = `${data.product.title} | Stealz`;
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        const e = err instanceof ApiClientError ? err : new ApiClientError(err.message, 0, 'server');
        setState({ status: 'error', message: e.message, code: e.code });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedRef, ready, locationKey, attempt]);

  const data = state.status === 'ready' ? state.data : null;
  const best = useMemo(() => (data ? cheapestOf(data.offers) : undefined), [data]);
  const locale = data ? COUNTRIES[data.location.country].locale : 'en-US';

  function saveToWatchlist() {
    if (!data || !best) return;
    const now = toggleWatch({
      ref: encodedRef,
      key: data.ref.k,
      title: data.product.title,
      image: data.product.images[0],
      savedTotal: best.total,
      currency: best.currency,
      store: best.store,
      country: data.location.country,
      savedAt: new Date().toISOString(),
    });
    setWatched(now);
  }

  if (!encodedRef) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="type-wide text-[26px] font-extrabold">This product link is missing</h1>
        <p className="mt-2 text-ink-soft">Search for the item again to compare prices.</p>
      </div>
    );
  }

  const sameColor = data?.offers.filter((o) => !o.colorNote) ?? [];
  const prices = (sameColor.length ? sameColor : data?.offers ?? []).map((o) => o.total);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      {data?.ref.q && (
        <Link href={`/search?q=${encodeURIComponent(data.ref.q)}`} className="inline-flex items-center gap-1 rounded-lg text-[14px] font-semibold text-ink-soft hover:text-ink">
          <ChevronLeftIcon size={16} /> Results for &ldquo;{data.ref.q}&rdquo;
        </Link>
      )}

      <div className="mt-4">
        {state.status === 'loading' && <ProductSkeleton />}
        {state.status === 'error' && (
          <div className="max-w-2xl">
            <Notice tone={state.code === 'rate_limited' || state.code === 'budget' ? 'warn' : 'error'} icon={<AlertIcon />}>
              <p>{state.message}</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className={`${buttonClass('secondary', 'sm')} mt-3`}>
                Try again
              </button>
            </Notice>
          </div>
        )}
      </div>

      {data && best && (
        <>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Gallery images={data.product.images} title={data.product.title} />
            <div>
              {data.product.brand && <p className="text-[14px] font-semibold text-muted">{data.product.brand}</p>}
              <h1 className="type-wide mt-1 text-[26px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[32px]">
                {data.product.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-soft">
                <Stars rating={data.product.rating} reviews={data.product.reviews} />
                <span>
                  {data.offers.length} {data.offers.length === 1 ? 'store' : 'stores'},{' '}
                  {prices.length > 1 && Math.min(...prices) !== Math.max(...prices)
                    ? `${formatMoney(Math.min(...prices), data.currency)} to ${formatMoney(Math.max(...prices), data.currency)}`
                    : formatMoney(best.total, data.currency)}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[14px] text-muted">
                <TruckIcon size={16} /> Delivered to{' '}
                <button type="button" onClick={openPicker} className="font-semibold text-ink underline underline-offset-2">
                  {data.location.label}
                </button>
              </p>

              {data.demo && (
                <div className="mt-4">
                  <Notice icon={<InfoIcon />}>Sample data. Live prices appear once the site&apos;s SerpApi key is added.</Notice>
                </div>
              )}
              {data.notices.map((n) => (
                <div key={n} className="mt-3">
                  <Notice tone="warn" icon={<InfoIcon />}>
                    {n}
                  </Notice>
                </div>
              ))}

              <div className="mt-6">
                <BestPick offers={data.offers} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={saveToWatchlist} className={buttonClass('secondary')} aria-pressed={watched}>
                  <BookmarkIcon size={16} filled={watched} />
                  {watched ? 'Saved' : 'Save'}
                </button>
                <a href="#alert" className={buttonClass('secondary')}>
                  Set a price alert
                </a>
                <ShareButton title={data.product.title} />
              </div>
            </div>
          </div>

          <section className="mt-14" aria-labelledby="stores-heading">
            <h2 id="stores-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
              Compare {data.offers.length} {data.offers.length === 1 ? 'store' : 'stores'}
            </h2>
            <p className="mt-1 text-[14px] text-muted">
              {data.location.country === 'US'
                ? 'Totals add shipping and sales tax for your ZIP code.'
                : `Prices include ${data.location.country === 'AE' ? 'VAT' : 'GST'}; totals add delivery fees.`}{' '}
              {data.demo ? 'Sample data.' : `Checked ${timeAgo(data.fetchedAt)}.`}
              {data.hiddenStores > 0 &&
                ` ${data.hiddenStores} ${data.hiddenStores === 1 ? 'store was' : 'stores were'} left out because they look like fake sellers.`}
            </p>
            <div className="mt-5">
              <OfferTable offers={data.offers} />
            </div>
          </section>

          <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <section aria-labelledby="deal-heading">
              <h2 id="deal-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
                Buy now or wait?
              </h2>
              <div className="mt-5">
                <DealScoreCard deal={data.deal} />
              </div>
            </section>
            <section aria-labelledby="delivery-heading">
              <h2 id="delivery-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
                When it arrives
              </h2>
              <div className="mt-5">
                <DeliveryTimeline offers={data.offers} locale={locale} />
              </div>
            </section>
          </div>

          <section className="mt-14" aria-labelledby="history-heading">
            <h2 id="history-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
              Price history
            </h2>
            <p className="mt-1 text-[14px] text-muted">
              Lowest total per day across stores
              {data.history?.synthetic ? '. Sample history for this demo item.' : data.history?.since ? `, tracked since ${new Date(data.history.since).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.` : '.'}
            </p>
            <div className="mt-5">
              {data.history && data.history.points.length >= 2 ? (
                <PriceHistory history={data.history} currency={data.currency} locale={locale} />
              ) : (
                <Notice icon={<InfoIcon />}>
                  We started tracking this item recently. Its price history fills in each time prices are checked, and an
                  alert will tell you when it drops.
                </Notice>
              )}
            </div>
          </section>

          <section id="alert" className="mt-14 scroll-mt-24" aria-labelledby="alert-heading">
            <h2 id="alert-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
              Get an alert when it drops
            </h2>
            <div className="mt-5 max-w-3xl">
              <TrackPrice data={data} encodedRef={encodedRef} onSaveToWatchlist={saveToWatchlist} watched={watched} />
            </div>
          </section>

          {data.similar.length > 0 && (
            <section className="mt-14" aria-labelledby="similar-heading">
              <h2 id="similar-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
                Similar items for less
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
                {data.similar.map((s) => (
                  <Link key={s.id} href={productHref(s.ref)} className="group block">
                    <ProductImage src={s.image} alt={s.title} className="aspect-square" />
                    <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug group-hover:underline">{s.title}</p>
                    <Money amount={s.total} currency={s.currency} className="type-cond mt-1 block text-[20px] font-extrabold" />
                    <p className="text-[12px] text-muted">at {s.store}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(data.product.description || (data.product.features && data.product.features.length > 0)) && (
            <section className="mt-14 max-w-3xl" aria-labelledby="about-heading">
              <h2 id="about-heading" className="type-wide text-[22px] font-extrabold tracking-[-0.03em]">
                About this item
              </h2>
              {data.product.description && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{data.product.description}</p>}
              {data.product.features && data.product.features.length > 0 && (
                <dl className="mt-5 grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-[14px]">
                  {data.product.features.map((f) => (
                    <div key={f.title} className="contents">
                      <dt className="text-muted">{f.title}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
