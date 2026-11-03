import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldIcon, TagIcon, TruckIcon } from '@/components/icons';
import { buttonClass } from '@/components/classes';

export const metadata: Metadata = {
  title: 'Stealz for Chrome',
  description:
    'Click Stealz on any product page to see what the same item costs at other stores with shipping and tax, which is cheapest, and other colors.',
};

const FEATURES = [
  {
    icon: <TagIcon size={20} />,
    title: 'Works on the page you’re on',
    body: 'Click the Stealz tag on any store’s product page. It reads the item for you, no copying and pasting.',
  },
  {
    icon: <TruckIcon size={20} />,
    title: 'Real totals, cheapest first',
    body: 'Every store’s price plus shipping and tax for your ZIP code, postcode, PIN code or city, and how much you’d save.',
  },
  {
    icon: <ShieldIcon size={20} />,
    title: 'Same item, other colors',
    body: 'If another store has it in a different color, you see that too, with the price. Fake shops and used listings are left out.',
  },
];

const STEPS = [
  { title: 'Download and unzip', body: 'Unzip stealz-extension.zip. You’ll get a folder called stealz-extension.' },
  { title: 'Open Chrome’s extensions page', body: 'Go to chrome://extensions and turn on Developer mode in the top-right corner.' },
  { title: 'Load it', body: 'Click Load unpacked and choose the stealz-extension folder.' },
  { title: 'Pin it', body: 'Click the puzzle piece next to the address bar, then the pin next to Stealz.' },
  { title: 'Shop', body: 'Open any product page and click the Stealz tag.' },
];

export default function ExtensionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-16">
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_400px]">
        <div>
          <p className="eyebrow text-accent-ink">Free extension</p>
          <h1 className="mt-3 text-title1">Stealz for Chrome</h1>
          <p className="mt-5 max-w-[52ch] text-intro text-ink-soft">
            Looking at something on a store’s site? Click Stealz to see what the same item costs everywhere else, delivered to
            you with shipping and tax, which store is cheapest, and the same item in other colors.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/stealz-extension.zip" download className={buttonClass('primary', 'lg')}>
              Download for Chrome
            </a>
            <a href="#install" className={buttonClass('secondary', 'lg')}>
              How to install
            </a>
          </div>
          <p className="mt-3 text-footnote text-muted">Free. Also works in Edge, Brave and other Chromium browsers.</p>

          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sticker/20 text-accent-ink">{f.icon}</span>
                <h2 className="mt-4 text-headline">{f.title}</h2>
                <p className="mt-1 text-subhead text-ink-soft">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <figure className="mx-auto w-full max-w-[380px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/extension-preview.webp"
            alt="The Stealz extension showing the lowest total for a bag, four stores with totals, and two other colors"
            width={380}
            height={854}
            className="w-full rounded-[1.75rem] shadow-float"
          />
          <figcaption className="mt-3 text-center text-caption text-muted">Example prices</figcaption>
        </figure>
      </div>

      <section id="install" aria-labelledby="install-heading" className="mt-20 scroll-mt-24">
        <h2 id="install-heading" className="text-title2">
          Install it in a minute
        </h2>
        <p className="mt-2 max-w-[60ch] text-subhead text-muted">
          Until Stealz is in the Chrome Web Store, add it straight from the download:
        </p>
        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="tnum grid h-9 w-9 place-items-center rounded-full bg-sticker/20 text-callout font-semibold text-accent-ink" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 text-headline">{s.title}</h3>
              <p className="mt-1 text-subhead text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="privacy-heading" className="mt-16 max-w-3xl rounded-card bg-canvas p-6">
        <h2 id="privacy-heading" className="text-headline">
          What it reads
        </h2>
        <p className="mt-2 text-subhead text-ink-soft">
          Stealz only looks at the page you’re on, and only when you click it. To find the item at other stores it sends Stealz the
          product’s name, brand, price and color, the store’s web address (not the page), and your location for shipping and tax.
          No account, no browsing history, nothing else from the page. Questions? See{' '}
          <Link href="/how-it-works" className="font-semibold text-ink underline underline-offset-2">
            how Stealz works
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
