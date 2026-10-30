import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { US_RATES_AS_OF } from '@/lib/tax';

export const metadata: Metadata = {
  title: 'How it works',
  description: `Where ${BRAND.name} gets prices, how totals and delivery dates are worked out, and what happens to your data.`,
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Where the prices come from',
    body: (
      <>
        <p>
          Searches use Google Shopping results for your country, which cover thousands of stores. When you open a product,
          we load every store Google lists for it, with each store&apos;s price, shipping, returns and delivery estimate. In
          the US, new eBay listings are added too.
        </p>
        <p>
          Results are reused for a few hours so popular searches load instantly. The page always says when prices were
          last checked.
        </p>
      </>
    ),
  },
  {
    title: 'How totals are worked out',
    body: (
      <>
        <p>
          A total is the item price plus shipping to your address plus tax. When a store offers free shipping over a set
          amount, we apply it if the item qualifies.
        </p>
        <p>
          In the US, online prices are shown before sales tax. We use the tax estimate Google shows for your location when
          there is one. Otherwise we estimate it from your state&apos;s combined average rate (Tax Foundation, as of{' '}
          {US_RATES_AS_OF}), including the clothing exemptions in Pennsylvania, New Jersey, Minnesota and Vermont, and the
          partial ones in New York, Massachusetts and Rhode Island. Your exact rate can differ slightly by city.
        </p>
        <p>Prices in the UK already include VAT, prices in the UAE include 5% VAT, and prices in India include GST.</p>
      </>
    ),
  },
  {
    title: 'Delivery dates',
    body: (
      <p>
        We read each store&apos;s delivery estimate for your ZIP code, postcode, PIN code or city (&ldquo;Free delivery by Mon&rdquo;,
        &ldquo;Arrives Nov 3–5&rdquo;) and turn it into dates. If a store gives no estimate, we say so rather than guess.
      </p>
    ),
  },
  {
    title: 'New items only',
    body: (
      <p>
        Listings marked used, pre-owned, refurbished or renewed are hidden, along with resale shops for designer goods.
        Marketplace sellers are labeled so you can judge them before buying, since authenticity of branded bags can vary.
      </p>
    ),
  },
  {
    title: 'Deal score and fake discounts',
    body: (
      <>
        <p>
          The deal score (0 to 100) compares today&apos;s lowest total with what other stores charge and, once we have it,
          the item&apos;s price history. 80 or more is a great deal; under 45 means it has been noticeably cheaper.
        </p>
        <p>
          When a store claims a big &ldquo;was&rdquo; price but other stores normally sell the item for about the sale price,
          we flag the discount as inflated.
        </p>
      </>
    ),
  },
  {
    title: 'Price history and alerts',
    body: (
      <p>
        Each time prices are checked, the lowest total per store is saved, and the chart shows the lowest total per day.
        Price alerts are checked daily. You confirm your email once, and every alert email has a one-click unsubscribe.
      </p>
    ),
  },
  {
    title: 'Your data',
    body: (
      <>
        <p>
          There are no accounts. Your approximate location comes from your internet connection, and you can change it
          anytime. If you choose &ldquo;Use my current location&rdquo;, your browser asks first, and the coordinates are
          turned into a postcode by BigDataCloud.
        </p>
        <p>
          Your location, recent searches and watchlist are stored in your browser. Your email is stored only if you set an
          alert, and only used to send that alert.
        </p>
      </>
    ),
  },
  {
    title: 'Before you buy',
    body: (
      <p>
        Prices and stock change quickly, and stores set their own shipping and tax at checkout. Always check the total on
        the store&apos;s site before paying. {BRAND.name} may earn a commission from some store links, which never changes
        the order of results.
      </p>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-10 sm:px-6">
      <h1 className="type-wide text-[34px] font-extrabold leading-tight tracking-[-0.035em]">How {BRAND.name} works</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        What we compare, how we work out the numbers, and what we do with your information.
      </p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-[19px] font-bold">{s.title}</h2>
            <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink-soft">{s.body}</div>
          </section>
        ))}
      </div>
      <Link href="/" className="mt-12 inline-flex rounded-full bg-ink px-5 py-3 font-semibold text-paper hover:bg-ink-soft">
        Search for something
      </Link>
    </div>
  );
}
