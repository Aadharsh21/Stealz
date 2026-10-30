import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codesInText, couponsFromItems } from '../lib/coupon-codes';
import { makeShipping } from '../lib/delivery';
import { finalizeOffer } from '../lib/offer';
import type { OfferContext } from '../lib/offer';
import { statedPercent } from '../lib/money';
import type { ProviderItem } from '../lib/providers/types';
import { chooseSaleItems, saleDiscount, storeSales } from '../lib/sale-select';
import { STORE_SITES, storeQuery } from '../lib/store-links';

const ctx: OfferContext = { today: 20755, country: 'US', currency: 'USD', locale: 'en-US', regionCode: 'AZ', postalCode: '85003' };

const item = (store: string, notes: string[], coupon?: string): ProviderItem => ({
  source: 'google',
  title: 'Coach Tabby Shoulder Bag 26',
  store,
  link: `https://${store.toLowerCase()}.com/p/1`,
  price: 450,
  notes,
  coupon,
});

test('promo codes are read from store notes and the coupon field, ordinary words are not', () => {
  assert.deepEqual(codesInText('Get 20% off with code SAVE20'), ['SAVE20']);
  assert.deepEqual(codesInText('Extra 15% off with promo code WELCOME-15 at checkout'), ['WELCOME-15']);
  assert.deepEqual(codesInText('Use code: FALL25'), ['FALL25']);
  assert.deepEqual(codesInText('No code needed'), []);
  assert.deepEqual(codesInText('Use code at checkout'), []);
  assert.deepEqual(codesInText('Discount applied in cart'), []);
  assert.deepEqual(codesInText('Free delivery on orders over $50'), []);

  const found = couponsFromItems([
    item('Nordstrom', ['Free shipping', 'Get 20% off with code SAVE20']),
    item('COACH', [], 'tabby10'),
    item('Macys', [], '20% off'),
    item('Nordstrom', ['Get 20% off with code SAVE20']),
  ]);
  assert.deepEqual(
    found.map((c) => `${c.store}:${c.code}`),
    ['Nordstrom:SAVE20', 'COACH:TABBY10'],
  );
  assert.equal(found[0].detail, 'Get 20% off with code SAVE20');
  assert.equal(found[0].link, 'https://nordstrom.com/p/1');
});

test('stated discounts count as on sale when a store shows no "was" price', () => {
  assert.equal(statedPercent(['51% OFF']), 51);
  assert.equal(statedPercent([undefined, 'Free delivery', '20% off']), 20);
  assert.equal(statedPercent(['SALE']), undefined);

  const stated = finalizeOffer({ source: 'google', store: 'Nordstrom', title: 'Coach Tabby Shoulder Bag 26', price: 300, discountPct: 40, shipping: makeShipping(ctx, 0) }, ctx);
  assert.equal(stated.discountPct, 40);
  assert.equal(stated.originalPrice, undefined);
  assert.ok(stated.tags.includes('40% off'));

  const was = finalizeOffer({ source: 'google', store: 'Nordstrom', title: 'Coach Tabby Shoulder Bag 26', price: 300, originalPrice: 400, discountPct: 60, shipping: makeShipping(ctx, 0) }, ctx);
  assert.equal(was.discountPct, 25, 'the "was" price wins over a stated percent');
});

test('sale page: real markdowns first, biggest first, inflated and other-color listings out', () => {
  const listing = (store: string, price: number, extra: Record<string, unknown> = {}) =>
    ({ ...finalizeOffer({ source: 'google', store, title: 'x', price, shipping: makeShipping(ctx, 0), ...extra }, ctx), productKey: store, match: 1, ref: 'r', ...extra }) as never;
  const group = (key: string, brand: string, listings: never[], image = `https://img/${key}.jpg`) =>
    ({ key, title: `${brand} ${key}`, brand, image, listings, bestTotal: 1, maxTotal: 1, storeCount: listings.length, match: 1, ref: key, multipleSources: false, onSale: true }) as never;

  const items = chooseSaleItems(
    [
      group('a', 'Coach', [listing('Macys', 300, { originalPrice: 400 })]),
      group('b', 'Gucci', [listing('Saks', 900, { originalPrice: 2000 })]),
      group('c', 'Prada', [listing('Neiman', 1000, { originalPrice: 2000, discountNote: 'Looks inflated' })]),
      group('d', 'Ganni', [listing('Nordstrom', 200, { discountPct: 5 })]),
      group('e', 'Fendi', [listing('Bloomingdales', 800, { originalPrice: 1000, colorNote: 'Green, not pink' })]),
      group('f', 'Kenzo', [listing('Revolve', 150)]),
      group('g', 'Loewe', [listing('Saks', 1200, { originalPrice: 1500 })], 'http://not-secure.jpg'),
    ],
    'USD',
  );
  assert.deepEqual(items.map((i) => `${i.ref}:${i.pct ?? '-'}`), ['b:55', 'a:25', 'f:-']);
  assert.equal(items[0].originalPrice, 2000);

  assert.equal(saleDiscount(listing('Macys', 300, { originalPrice: 400 })), 25);
  assert.equal(saleDiscount(listing('Macys', 300, { originalPrice: 400, priceWarning: 'Too cheap' })), null);

  const stores = storeSales({ women: items, bags: [{ ...items[0], ref: 'z', pct: 70 }] });
  assert.equal(stores[0].store, 'Saks');
  assert.equal(stores[0].items, 2);
  assert.equal(stores[0].maxPct, 70);
});

test('more-store links: every country has some, and searches are built correctly', () => {
  for (const country of ['US', 'GB', 'AE', 'IN'] as const) {
    assert.ok(STORE_SITES[country].length >= 7, country);
    for (const s of STORE_SITES[country]) assert.match(s.search('coach bag'), /^https:\/\//, `${country} ${s.name}`);
  }
  const ae = Object.fromEntries(STORE_SITES.AE.map((s) => [s.name, s]));
  assert.equal(ae.Trendyol.search('coach bag'), 'https://www.trendyol.com/en/sr?q=coach%20bag');
  assert.equal(ae['Brands For Less'].search('coach bag'), 'https://www.brandsforless.com/en-ae/search/?q=coach%20bag');
  assert.match(ae.Ounass.search('coach bag'), /^https:\/\/www\.google\.com\/search\?q=coach%20bag%20site%3Aounass\.ae$/);
  const gb = Object.fromEntries(STORE_SITES.GB.map((s) => [s.name, s]));
  assert.equal(gb.Very.search("Barbour Men's Beaufort"), 'https://www.very.co.uk/e/q/barbour-men-s-beaufort.end');
  assert.match(gb.Farfetch.search("men's wax jacket"), /\/uk\/shopping\/men\/search/);
  assert.match(gb.Farfetch.search("women's wax jacket"), /\/uk\/shopping\/women\/search/);
  const india = Object.fromEntries(STORE_SITES.IN.map((s) => [s.name, s]));
  assert.equal(india.Myntra.search('Nike Dunk Low'), 'https://www.myntra.com/nike-dunk-low');
  assert.equal(storeQuery('Coach Tabby Shoulder Bag 26 in Signature Canvas, Brass/Black (Size One Size)'), 'Coach Tabby Shoulder Bag 26 in Signature');
  assert.equal(storeQuery('Barbour Beaufort Wax Jacket - Sage'), 'Barbour Beaufort Wax Jacket');
});
