import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeShipping } from '../lib/delivery';
import { lookupQuery, pickOffers, storeStem } from '../lib/lookup-select';
import { finalizeOffer } from '../lib/offer';
import type { OfferContext } from '../lib/offer';
import type { Listing } from '../lib/types';

const ctx: OfferContext = { today: 20755, country: 'US', currency: 'USD', locale: 'en-US', regionCode: 'AZ', postalCode: '85003' };

const listing = (store: string, title: string, price: number, opts: { match?: number; shipping?: number; link?: string } = {}): Listing =>
  ({
    ...finalizeOffer({ source: 'google', store, title, price, link: opts.link, shipping: makeShipping(ctx, opts.shipping ?? 0) }, ctx),
    productKey: `${store}|${title}`,
    match: opts.match ?? 1,
    ref: `ref-${store}`,
  }) as Listing;

test('product page titles become clean searches, colors set aside', () => {
  assert.deepEqual(lookupQuery('Coach Tabby Shoulder Bag 26 | Nordstrom'), { query: 'Coach Tabby Shoulder Bag 26', color: undefined });
  assert.deepEqual(lookupQuery('Tabby Shoulder Bag 26 In Black | COACH', 'Coach'), { query: 'Coach Tabby Shoulder Bag 26', color: 'Black' });
  assert.deepEqual(lookupQuery('Buy Nike Dunk Low Retro White Black Online at Best Price | Myntra'), { query: 'Nike Dunk Low Retro', color: 'White' });
  assert.deepEqual(lookupQuery("Women's Barbour Beaufort Wax Jacket, Olive (Size 12)", 'Barbour'), { query: "Women's Barbour Beaufort Wax Jacket", color: 'Olive' });
  assert.equal(lookupQuery('Le Pliage Original Large Tote Bag', 'Longchamp').query, 'Longchamp Le Pliage Original Large Tote Bag');
  assert.equal(lookupQuery('COACH® | Tabby Shoulder Bag 26').query, 'Tabby Shoulder Bag 26');
  assert.deepEqual(lookupQuery('Nike Dunk Low Retro – White/Black'), { query: 'Nike Dunk Low Retro', color: 'White' });
  assert.deepEqual(lookupQuery('Tabby Shoulder Bag 26 | Red Rae Townhouse'), { query: 'Tabby Shoulder Bag 26', color: undefined });
});

test('store web addresses are reduced to the store name', () => {
  assert.equal(storeStem('www.nordstrom.com'), 'nordstrom');
  assert.equal(storeStem('www.amazon.co.uk'), 'amazon');
  assert.equal(storeStem('en-ae.aivi.com'), 'aivi');
  assert.equal(storeStem('shop.coach.com'), 'coach');
  assert.equal(storeStem(undefined), undefined);
});

test('same item vs other colors, cheapest, and savings against this store', () => {
  const pick = pickOffers(
    [
      listing('Nordstrom', 'Coach Tabby Shoulder Bag 26 Black', 450, { link: 'https://www.nordstrom.com/s/123' }),
      listing("Macy's", 'Coach Tabby Shoulder Bag 26 in Black', 395, { shipping: 0 }),
      listing('COACH', 'Tabby Shoulder Bag 26', 440),
      listing('Saks Fifth Avenue', 'Coach Tabby Shoulder Bag 26 Chalk', 380),
      listing('Bloomingdale\'s', 'Coach Tabby Shoulder Bag 26 Sage Green', 410),
      listing('Revolve', 'Coach Tabby Shoulder Bag 26 Green', 399),
      listing('eBay', 'Coach Tabby wallet black', 90, { match: 0.4 }),
    ],
    { pageColor: 'Black', host: 'www.nordstrom.com', pagePrice: 450, pageCurrency: 'USD', currency: 'USD' },
  );
  assert.deepEqual(pick.sameItem.map((o) => o.store), ["Macy's", 'COACH', 'Nordstrom']);
  assert.equal(pick.cheapest?.store, "Macy's");
  assert.equal(pick.here?.store, 'Nordstrom');
  assert.ok(pick.here?.thisStore);
  assert.equal(pick.savings?.basis, 'total');
  assert.ok((pick.savings?.amount ?? 0) > 50);
  assert.deepEqual(pick.otherColors.map((c) => c.color), ['Chalk', 'Green']);
  assert.deepEqual(pick.otherColors[1].offers.map((o) => o.store), ['Revolve', "Bloomingdale's"]);
  assert.equal(pick.bestRef, "ref-Macy's");
});

test('without this store in the results, savings compare item prices; without a color, colors are listed', () => {
  const pick = pickOffers(
    [listing('Nordstrom', 'Coach Tabby Shoulder Bag 26 Black', 420), listing('Saks Fifth Avenue', 'Coach Tabby Shoulder Bag 26 Chalk', 380)],
    { host: 'www.somestore.com', pagePrice: 450, pageCurrency: 'USD', currency: 'USD' },
  );
  assert.equal(pick.here, undefined);
  assert.deepEqual(pick.savings, { amount: 70, basis: 'price' });
  assert.deepEqual(pick.otherColors.map((c) => c.color).sort(), ['Black', 'Chalk']);
  const otherCurrency = pickOffers([listing('Nordstrom', 'Coach Tabby Shoulder Bag 26', 420)], { pagePrice: 450, pageCurrency: 'GBP', currency: 'USD' });
  assert.equal(otherCurrency.savings, undefined);
});
