'use client';

import type { CountryCode, CurrencyCode } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { useLocation } from './location-provider';
import { Sticker } from './ui';

interface ExampleRow {
  store: string;
  price: number;
  shipping: number;
  tax: number;
  days: string;
}

interface Example {
  item: string;
  to: string;
  currency: CurrencyCode;
  taxLabel: string;
  rows: ExampleRow[];
}

// Illustrative numbers that show how a comparison reads; real results come from live store data.
const EXAMPLES: Record<CountryCode, Example> = {
  US: {
    item: 'Coach Tabby Shoulder Bag 26',
    to: 'Tempe, AZ 85281',
    currency: 'USD',
    taxLabel: 'Est. tax',
    rows: [
      { store: 'Nordstrom Rack', price: 285, shipping: 0, tax: 24.34, days: '5–7 days' },
      { store: "Macy's", price: 345, shipping: 0, tax: 29.46, days: '4–7 days' },
      { store: 'Coach', price: 520, shipping: 0, tax: 44.41, days: '4 days' },
    ],
  },
  AE: {
    item: 'Michael Kors Parker Watch',
    to: 'Dubai, UAE',
    currency: 'AED',
    taxLabel: 'VAT',
    rows: [
      { store: 'noon', price: 1095, shipping: 0, tax: 0, days: '1–2 days' },
      { store: 'Namshi', price: 1170, shipping: 0, tax: 0, days: '2–3 days' },
      { store: 'Farfetch', price: 1150, shipping: 40, tax: 0, days: '5–8 days' },
    ],
  },
  IN: {
    item: "Levi's 511 Slim Fit Jeans",
    to: 'Bengaluru 560001',
    currency: 'INR',
    taxLabel: 'GST',
    rows: [
      { store: 'AJIO', price: 2399, shipping: 0, tax: 0, days: '4–6 days' },
      { store: 'Myntra', price: 2549, shipping: 0, tax: 0, days: '3–5 days' },
      { store: 'Flipkart', price: 2499, shipping: 99, tax: 0, days: '3–4 days' },
    ],
  },
};

function Leader({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 ${strong ? 'text-[16px] font-bold text-ink' : 'text-[14px] text-ink-soft'}`}>
      <span>{label}</span>
      <span className="flex-1 translate-y-[-3px] border-b-2 border-dotted border-line-strong" aria-hidden="true" />
      <span className="tnum">{value}</span>
    </div>
  );
}

export function ReceiptExample() {
  const { location } = useLocation();
  const ex = EXAMPLES[location?.country ?? 'US'];
  const money = (n: number) => formatMoney(n, ex.currency);
  const rows = [...ex.rows].sort((a, b) => a.price + a.shipping + a.tax - (b.price + b.shipping + b.tax));
  const [best, ...rest] = rows;
  const bestTotal = best.price + best.shipping + best.tax;
  const worst = rows[rows.length - 1];
  const saving = worst.price + worst.shipping + worst.tax - bestTotal;

  return (
    <figure className="relative mx-auto w-full max-w-[420px] lg:ml-auto" aria-label={`Example comparison for ${ex.item}`}>
      <div
        className="rounded-t-2xl bg-paper px-6 pb-10 pt-6 shadow-[0_24px_60px_-28px_rgba(29,35,64,0.35)] ring-1 ring-line"
        style={{
          WebkitMaskImage:
            'linear-gradient(#000 0 0) top/100% calc(100% - 12px) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/16px 12px repeat-x',
          maskImage:
            'linear-gradient(#000 0 0) top/100% calc(100% - 12px) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/16px 12px repeat-x',
        }}
      >
        <figcaption>
          <p className="text-[13px] text-muted">Example comparison</p>
          <p className="mt-1 text-[18px] font-bold leading-snug">{ex.item}</p>
          <p className="text-[14px] text-muted">Delivered to {ex.to}</p>
        </figcaption>

        <div className="mt-5 border-t-2 border-dashed border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-bold">{best.store}</span>
            <Sticker>Lowest total</Sticker>
          </div>
          <div className="mt-3 space-y-1.5">
            <Leader label="Item" value={money(best.price)} />
            <Leader label="Shipping" value={best.shipping ? money(best.shipping) : 'Free'} />
            <Leader label={ex.taxLabel} value={best.tax ? money(best.tax) : 'Included'} />
            <Leader label="Total" value={money(bestTotal)} strong />
          </div>
          <p className="mt-2 text-[13px] text-muted">Arrives in {best.days}</p>
        </div>

        <div className="mt-4 space-y-2 border-t-2 border-dashed border-line pt-4">
          {rest.map((r) => (
            <div key={r.store} className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="font-semibold">{r.store}</span>
              <span className="flex-1 translate-y-[-3px] border-b-2 border-dotted border-line" aria-hidden="true" />
              <span className="tnum text-ink-soft">{money(r.price + r.shipping + r.tax)}</span>
              <span className="w-[5.5rem] text-right text-[13px] text-muted">{r.days}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[14px] font-semibold">
          {money(saving)} less than the most expensive store.
        </p>
      </div>
    </figure>
  );
}
