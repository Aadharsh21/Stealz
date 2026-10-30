import Link from 'next/link';
import { HomeLocationLine, HomePopular } from '@/components/home-popular';
import { ReceiptExample } from '@/components/receipt-example';
import { SearchBox } from '@/components/search-box';
import { Flag } from '@/components/flags';
import { BellIcon, ReturnIcon, ShieldIcon, TagIcon, TruckIcon } from '@/components/icons';
import { CATEGORIES } from '@/lib/suggestions';

const STEPS = [
  {
    title: 'Search once',
    body: 'Type a brand, a model or just "black leather tote". We pull new listings from every store Google Shopping knows about.',
  },
  {
    title: 'Compare what you’d actually pay',
    body: 'Each store’s price plus shipping and tax for your address, and the day it would reach you. Same item, side by side.',
  },
  {
    title: 'Buy now or wait',
    body: 'A deal score tells you if today’s price is good. Not yet? Set a target price and we’ll email you when it drops.',
  },
];

const COUNTRIES_COPY = [
  {
    code: 'US' as const,
    name: 'United States',
    stores: 'Nordstrom, Macy’s, Zappos, Amazon, brand stores and more',
    tax: 'Sales tax estimated for your ZIP code, including clothing exemptions in states like NY, PA and NJ.',
  },
  {
    code: 'AE' as const,
    name: 'United Arab Emirates',
    stores: 'Namshi, noon, Ounass, 6thStreet, Amazon.ae and more',
    tax: 'Prices already include 5% VAT, so totals add only delivery fees.',
  },
  {
    code: 'IN' as const,
    name: 'India',
    stores: 'Myntra, AJIO, Tata CLiQ, Amazon.in, Flipkart and more',
    tax: 'Prices already include GST, so totals add only delivery charges.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.12fr_1fr] lg:gap-16">
        <div>
          <h1 className="type-wide type-hero text-[52px] leading-[0.95] sm:text-[68px] lg:text-[78px]">
            Find the real steal.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[18px] leading-relaxed text-ink-soft">
            Search any bag, shoe or jacket. We check the stores, add shipping and tax for where you live, and show you who
            gets it to your door first.
          </p>
          <div className="mt-8 max-w-[38rem]">
            <SearchBox size="lg" />
          </div>
          <HomePopular />
          <HomeLocationLine />
        </div>
        <ReceiptExample />
      </section>

      <section className="border-y border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="type-wide text-[28px] font-extrabold tracking-[-0.03em]">How Stealz works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <span
                  className="type-cond grid h-11 w-11 place-items-center rounded-full text-[22px] text-sticker ring-1 ring-sticker/60"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[18px] font-bold">{step.title}</h3>
                <p className="mt-2 max-w-[32ch] text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="type-wide text-[28px] font-extrabold tracking-[-0.03em]">Totals for where you live</h2>
            <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-ink-soft">
              A cheaper sticker price can cost more once shipping and tax are added. Stealz works out the full amount for
              your address in three countries.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-ink-soft">
              <li className="flex gap-3">
                <TruckIcon className="mt-0.5 shrink-0 text-ink" /> Delivery dates for your ZIP, PIN code or city
              </li>
              <li className="flex gap-3">
                <ShieldIcon className="mt-0.5 shrink-0 text-ink" /> New items only. Used and resale listings are filtered out
              </li>
              <li className="flex gap-3">
                <TagIcon className="mt-0.5 shrink-0 text-ink" /> Inflated &ldquo;was&rdquo; prices flagged so fake sales don&apos;t fool you
              </li>
              <li className="flex gap-3">
                <ReturnIcon className="mt-0.5 shrink-0 text-ink" /> Return windows and marketplace sellers called out
              </li>
              <li className="flex gap-3">
                <BellIcon className="mt-0.5 shrink-0 text-ink" /> Price-drop emails with no account needed
              </li>
            </ul>
          </div>
          <div className="divide-y divide-line rounded-2xl ring-1 ring-line">
            {COUNTRIES_COPY.map((c) => (
              <div key={c.code} className="flex gap-4 p-5">
                <Flag country={c.code} className="mt-1" />
                <div>
                  <h3 className="text-[16px] font-bold">{c.name}</h3>
                  <p className="mt-1 text-[14px] text-ink-soft">{c.stores}</p>
                  <p className="mt-1 text-[14px] text-muted">{c.tax}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-[16px] font-bold">Browse a category</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/search?q=${encodeURIComponent(c)}`}
              className="rounded-full px-4 py-2 text-[15px] font-semibold ring-1 ring-line-strong hover:bg-canvas"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
