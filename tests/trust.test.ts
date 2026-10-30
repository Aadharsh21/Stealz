import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markPriceOutliers } from '../lib/deal';
import { makeShipping } from '../lib/delivery';
import { finalizeOffer } from '../lib/offer';
import type { OfferContext } from '../lib/offer';
import { cheapestOf, rankOffers } from '../lib/scoring';
import { isKnownRetailer, isSuspiciousStore, looksUsed } from '../lib/stores';

const ctx: OfferContext = { today: 20755, country: 'US', currency: 'USD', locale: 'en-US', regionCode: 'AZ', postalCode: '85003' };

const offer = (store: string, price: number) =>
  finalizeOffer({ source: 'google', store, title: 'Coach Tabby Shoulder Bag 26', price, shipping: makeShipping(ctx, 0) }, ctx);

test('fake-shop store names are flagged, real stores are not', () => {
  assert.equal(isSuspiciousStore('haidfoundation.org', undefined, 'US'), true);
  assert.equal(isSuspiciousStore('crecheidanha.pt', undefined, 'US'), true);
  assert.equal(isSuspiciousStore('silferconsulta.com', undefined, 'US'), true);
  assert.equal(isSuspiciousStore('Sterilesurgisciences', undefined, 'US'), true);
  assert.equal(isSuspiciousStore("Dillard's", undefined, 'US'), false);
  assert.equal(isSuspiciousStore('coach.com', undefined, 'US'), false);
  assert.equal(isSuspiciousStore('farfetch.com', undefined, 'US'), false);
  assert.equal(isSuspiciousStore('Harvey Nichols', 'harveynichols.co.uk', 'AE'), false);
  assert.equal(isSuspiciousStore('Myntra', 'myntra.in', 'IN'), false);
  assert.equal(isKnownRetailer('Nordstrom Rack'), true);
  assert.equal(isKnownRetailer('Carry & Carry'), false);
});

test('restored and re-loved items count as used', () => {
  assert.equal(looksUsed('COACH Restored Tabby Shoulder Bag 26'), true);
  assert.equal(looksUsed('Soft Tabby 26 Loved Shoulder Bag'), true);
  assert.equal(looksUsed('Coach Tabby Shoulder Bag 26'), false);
});

test('suspiciously cheap listings are flagged and lose "lowest total"', () => {
  const offers = markPriceOutliers([
    offer('COACH', 495),
    offer("Dillard's", 450),
    offer('Zappos.com', 450),
    offer('Bloomingdale\'s', 385),
    offer('Carry & Carry', 59.6),
  ]);
  const fake = offers.find((o) => o.store === 'Carry & Carry');
  assert.ok(fake?.priceWarning, 'expected a price warning');
  assert.ok(fake?.tags.includes('Check this price'));
  assert.equal(offers.find((o) => o.store === "Bloomingdale's")?.priceWarning, undefined);
  assert.equal(cheapestOf(offers)?.store, "Bloomingdale's");
  assert.notEqual(rankOffers(offers)[0].offer.store, 'Carry & Carry');
});

test('unverified sellers lose picks to verified stores', () => {
  const offers = [offer('haidfoundation.org', 440), offer('COACH', 495)];
  assert.ok(offers[0].tags.includes('Unverified seller'));
  assert.equal(cheapestOf(offers)?.store, 'COACH');
});

test('estimated tax is added on top of a provider total that leaves it out', () => {
  const o = finalizeOffer({ source: 'google', store: 'Editorialist', title: 'Coach Tabby Shoulder Bag 26', price: 457, providerTotal: 457, shipping: makeShipping(ctx, 0) }, ctx);
  assert.equal(o.tax.mode, 'estimated');
  assert.equal(o.total, 496.03);
  const withShipping = finalizeOffer({ source: 'google', store: 'Lyst', title: 'Coach Tabby Shoulder Bag 26', price: 475, providerTotal: 523 }, ctx);
  assert.equal(withShipping.shipping.cost, 48);
  assert.equal(withShipping.total, 563.57);
});
