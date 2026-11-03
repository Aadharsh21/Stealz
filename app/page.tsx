import Link from 'next/link';
import { HomeLocationLine, HomePopular } from '@/components/home-popular';
import { HomePicks } from '@/components/home-picks';
import { SearchBox } from '@/components/search-box';
import { Flag } from '@/components/flags';
import { BellIcon, ChevronRightIcon, GlobeIcon, ReturnIcon, ShieldIcon, TagIcon, TicketIcon, TruckIcon } from '@/components/icons';
import { chipClass } from '@/components/classes';
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
    code: 'GB' as const,
    name: 'United Kingdom',
    stores: 'Selfridges, John Lewis, ASOS, END., Amazon.co.uk and more',
    tax: 'Prices already include VAT, so totals add only delivery fees.',
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

const DEALS = [
  {
    href: '/sale',
    icon: <TagIcon size={20} />,
    tint: 'bg-markdown/12 text-markdown',
    title: 'On sale this week',
    body: 'Real markdowns on designer clothes, bags and sneakers. Fake shops and inflated “was” prices are left out.',
    cta: 'See what’s on sale',
  },
  {
    href: '/coupons',
    icon: <TicketIcon size={20} />,
    tint: 'bg-sticker/20 text-accent-ink',
    title: 'Coupons and offers',
    body: 'Promo codes stores publish, which stores have sales on, and more stores to check where you live.',
    cta: 'Find a code',
  },
  {
    href: '/extension',
    icon: <GlobeIcon size={20} />,
    tint: 'bg-fill-strong text-ink',
    title: 'Stealz for Chrome',
    body: 'Click it on any store’s product page to see the same item everywhere else, cheapest first, and in other colors.',
    cta: 'Get the extension',
  },
];

const PROMISES = [
  { icon: <TruckIcon />, text: 'Delivery dates for your ZIP code, postcode, PIN code or city' },
  { icon: <ShieldIcon />, text: 'New items only. Used and resale listings are filtered out' },
  { icon: <TagIcon />, text: 'Inflated “was” prices flagged so fake sales don’t fool you' },
  { icon: <ReturnIcon />, text: 'Return windows and marketplace sellers called out' },
  { icon: <BellIcon />, text: 'Price-drop emails with no account needed' },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <h1 className="text-display">Find the real steal.</h1>
        <p className="mx-auto mt-5 max-w-[34rem] text-intro text-ink-soft">
          Search any bag, shoe or jacket. We check the stores, add shipping and tax for where you live, and show you who gets
          it to your door first.
        </p>
        <div className="mx-auto mt-9 max-w-[40rem] text-left">
          <SearchBox size="lg" />
        </div>
        <HomePopular center />
        <HomeLocationLine />
      </section>

      <HomePicks />

      <section aria-label="Deals" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {DEALS.map((d) => (
            <Link key={d.href} href={d.href} className="press-soft group flex flex-col rounded-card bg-canvas p-6 sm:p-7">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${d.tint}`}>{d.icon}</span>
              <h2 className="mt-5 text-title3">{d.title}</h2>
              <p className="mt-2 max-w-[44ch] flex-1 text-subhead text-ink-soft">{d.body}</p>
              <span className="mt-5 inline-flex items-center gap-0.5 text-subhead font-semibold text-accent-ink">
                {d.cta}
                <ChevronRightIcon size={16} strokeWidth={2.2} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-title2">How Stealz works</h2>
        <ol className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="tnum grid h-9 w-9 place-items-center rounded-full bg-sticker/20 text-callout font-semibold text-accent-ink" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 text-headline">{step.title}</h3>
              <p className="mt-1.5 max-w-[34ch] text-subhead text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          <div>
            <h2 className="text-title2">Totals for where you live</h2>
            <p className="mt-3 max-w-[40ch] text-callout text-ink-soft">
              A cheaper sticker price can cost more once shipping and tax are added. Stealz works out the full amount for your
              address in four countries.
            </p>
            <ul className="mt-7 space-y-3.5">
              {PROMISES.map((p) => (
                <li key={p.text} className="flex gap-3 text-subhead text-ink-soft">
                  <span className="mt-px shrink-0 text-accent-ink">{p.icon}</span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="divide-hairline overflow-hidden rounded-card bg-canvas">
            {COUNTRIES_COPY.map((c) => (
              <div key={c.code} className="flex gap-4 px-5 py-4">
                <Flag country={c.code} className="mt-1" />
                <div className="min-w-0">
                  <h3 className="text-headline">{c.name}</h3>
                  <p className="mt-0.5 text-subhead text-ink-soft">{c.stores}</p>
                  <p className="mt-1 text-footnote text-muted">{c.tax}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-headline">Browse a category</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/search?q=${encodeURIComponent(c)}`} className={chipClass(false)}>
              {c}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
