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

test('luxury bags far below the brand price are flagged; guides and rentals are dropped', async () => {
  const { luxuryFloorWarning } = await import('../lib/luxury');
  const { isNotAnItem, isResaleStore } = await import('../lib/stores');
  assert.ok(luxuryFloorWarning('Chanel Mini 22 Lady Bag 245', 132.96, 'USD'));
  assert.equal(luxuryFloorWarning('Chanel Black Caviar Wallet on Chain', 4360.94, 'USD'), null);
  assert.ok(luxuryFloorWarning('Louis Vuitton Neverfull MM Tote', 210, 'USD'));
  assert.equal(luxuryFloorWarning('Louis Vuitton Neverfull MM Tote', 2100, 'USD'), null);
  assert.equal(luxuryFloorWarning('Coach Tabby Shoulder Bag 26', 120, 'USD'), null);
  assert.ok(luxuryFloorWarning('Gucci GG Marmont Shoulder Bag', 9000, 'INR'));
  assert.equal(luxuryFloorWarning('Gucci Sunglasses GG0061S', 150, 'USD'), null);
  assert.equal(isNotAnItem('DJR Expert Guide Series, Vol. 2542 - How to Identify Authentic Chanel Bags'), true);
  assert.equal(isNotAnItem('Dior Book Tote Medium'), false);
  assert.equal(isNotAnItem('Chanel Classic Flap Bag with Dust Bag and Box'), false);
  assert.equal(isResaleStore('Pickle'), true);
  assert.equal(isResaleStore('Nordstrom'), false);
});

test('copy shops and replica listings are recognized', async () => {
  const { looksCounterfeit } = await import('../lib/stores');
  assert.equal(looksCounterfeit('mastercopydubai.com', 'Women Coach Willow 24 Tote Bag'), true);
  assert.equal(looksCounterfeit('Lune Collection', 'Coach Willow Tote first copy'), true);
  assert.equal(looksCounterfeit('Shop', 'Chanel 22 Bag 1:1 Mirror Quality'), true);
  assert.equal(looksCounterfeit('Amazon.com', 'Lululemon Belt Bag Dupe'), true);
  assert.equal(looksCounterfeit('COACH', 'COACH Tabby Shoulder Bag 26 Inspired by Lilas'), false);
  assert.equal(looksCounterfeit("Dillard's", 'Coach Willow Tote 24'), false);
  assert.equal(looksCounterfeit('Nordstrom', 'Faux Fur Coat'), false);
});

test('colors: a different color is called out, matching or unstated colors are not', async () => {
  const { colorMismatch, wantedColorText } = await import('../lib/colors');
  assert.equal(colorMismatch('swarovski millenia necklace pink', "Swarovski Women's Millenia Green Necklace"), 'Green, not pink');
  assert.equal(colorMismatch('Millenia necklace, Octagon cut, Pink, Gold-tone plated', 'Millenia necklace, Octagon cut, Green, Gold-tone plated'), 'Green, not pink');
  assert.equal(colorMismatch('swarovski millenia necklace pink', 'Swarovski Millenia Necklace Octagon Cut'), null);
  assert.equal(colorMismatch('millenia necklace lilac', 'Millenia Tennis necklace Octagon cut Purple Gold-tone finish'), null);
  assert.equal(colorMismatch('coach tabby 26 black', 'Coach Tabby Shoulder Bag 26 in Black Denim'), null);
  assert.equal(colorMismatch('rose gold watch', 'Fossil watch rose gold tone'), null);
  assert.equal(colorMismatch('rose gold watch', 'Fossil watch silver tone'), 'Silver tone, not rose gold');
  assert.equal(colorMismatch('millenia necklace pink', 'Millenia Tennis Necklace Octagon Cut Caramel Gold Tone'), 'Caramel, not pink');
  assert.equal(colorMismatch('millenia necklace pink', 'MILLENIA NECKLACE OCTAGON CUT GOLD TONE PLATED'), null);
  assert.equal(colorMismatch('michael kors jet set tote black', 'Michael Kors Jet Set Large Tote'), null);
  assert.equal(colorMismatch('emerald cut ring', 'Emerald cut ring white gold'), null);
  assert.equal(wantedColorText('swarovski millenia necklace', 'Millenia necklace Pink'), 'Millenia necklace Pink');
});

test('store links are made absolute or replaced with a search', async () => {
  const { cleanLink } = await import('../lib/links');
  assert.equal(cleanLink('https://www.swarovski.com/en-AE/p-5671251'), 'https://www.swarovski.com/en-AE/p-5671251');
  assert.equal(cleanLink('/url?q=https://www.swarovski.com/p-1&sa=U'), 'https://www.swarovski.com/p-1');
  assert.equal(cleanLink('/aclk?sa=l&ai=abc'), 'https://www.google.com/aclk?sa=l&ai=abc');
  assert.equal(cleanLink('p-5671251.html'), undefined);
  const o = finalizeOffer({ source: 'google', store: 'Swarovski.ae', title: 'Millenia necklace', price: 2600 }, ctx);
  assert.equal(o.linkIsSearch, true);
  assert.match(o.link ?? '', /^https:\/\/www\.google\.com\/search\?q=/);
});

test('model names matter more than category and color words when matching', async () => {
  const { matchScore, CLOSE_MATCH } = await import('../lib/text');
  assert.ok(matchScore('swarovski millenia necklace pink', 'Maira Pendant Pink – Swarovski Crystal Pendant Necklace') < CLOSE_MATCH);
  assert.ok(matchScore('swarovski millenia necklace pink', 'Swarovski Millenia Tennis necklace Octagon cut Purple') >= CLOSE_MATCH);
  assert.ok(matchScore('coach tabby shoulder bag 26', 'COACH Tabby Shoulder Bag 26 Women\'s') >= CLOSE_MATCH);
});

test('home picks need a photo, mix brands and skip other colors', async () => {
  const { choosePicks } = await import('../lib/pick-select');
  const listing = (store: string, price: number, extra: Record<string, unknown> = {}) =>
    ({ ...offer(store, price), productKey: store, match: 1, ref: 'r', ...extra }) as never;
  const group = (key: string, brand: string, image: string | undefined, listings: never[]) =>
    ({ key, title: `${brand} ${key}`, brand, image, listings, bestTotal: 1, maxTotal: 1, storeCount: listings.length, match: 1, ref: key, multipleSources: false, onSale: false }) as never;
  const picks = choosePicks(
    [
      group('a', 'Coach', 'https://img/a.jpg', [listing('COACH', 450), listing('Macys', 420)]),
      group('b', 'Coach', 'https://img/b.jpg', [listing('COACH', 300)]),
      group('c', 'Coach', 'https://img/c.jpg', [listing('COACH', 250)]),
      group('d', 'Gucci', undefined, [listing('Gucci', 2000)]),
      group('e', 'Prada', 'https://img/e.jpg', [listing('Prada', 1900, { colorNote: 'Green, not pink' })]),
    ],
    'USD',
  );
  assert.deepEqual(picks.map((p) => p.ref), ['a', 'b']);
  assert.equal(picks[0].price, 420);
  assert.equal(picks[0].store, 'Macys');
});
