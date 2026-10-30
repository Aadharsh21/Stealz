import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, formatPostal, isCountryCode, regionCodeFromName, regionName } from '../lib/countries';
import { makeShipping, parseShippingText } from '../lib/delivery';
import type { ParseContext } from '../lib/delivery';
import { luxuryFloorWarning } from '../lib/luxury';
import { findMoneyInText, formatMoney } from '../lib/money';
import { isKnownRetailer, isSuspiciousStore } from '../lib/stores';
import { taxFor } from '../lib/tax';

const gb: ParseContext = { today: 20755, country: 'GB', currency: 'GBP', locale: 'en-GB' };

test('UK postcodes: full codes pass, partial codes and ZIP codes do not', () => {
  const ok = COUNTRIES.GB.postal!.pattern;
  for (const pc of ['SW1A1AA', 'M11AE', 'B338TH', 'EC1A1BB', 'CR26XH', 'DN551PT', 'W1A0AX']) assert.ok(ok.test(pc), pc);
  for (const pc of ['SW1A', '85281', 'SW1A1A', '1AA']) assert.equal(ok.test(pc), false, pc);
  assert.equal(formatPostal('GB', 'sw1a1aa'), 'SW1A 1AA');
  assert.equal(formatPostal('GB', 'm1 1ae'), 'M1 1AE');
  assert.equal(formatPostal('US', '85281'), '85281');
  assert.equal(isCountryCode('GB'), true);
  assert.equal(isCountryCode('UK'), false);
  assert.equal(regionName('GB', 'GB-SCT'), 'Scotland');
  assert.equal(regionCodeFromName('GB', 'Northern Ireland'), 'NIR');
});

test('UK locations read and print like UK addresses', async () => {
  let location: typeof import('../lib/location');
  try {
    location = await import('../lib/location');
  } catch {
    return; // the database client isn't installed in this checkout
  }
  const loc = location.locationFromParams(new URLSearchParams('country=uk&postal=sw1a 1aa'));
  assert.equal(loc.country, 'GB');
  assert.equal(loc.postalCode, 'SW1A1AA');
  assert.equal(location.locationFromParams(new URLSearchParams('country=GB&postal=SW1A')).postalCode, undefined);
  assert.equal(location.describeLocation({ ...loc, city: 'London' }), 'London SW1A 1AA');
  assert.equal(location.describeLocation({ country: 'GB', city: 'Manchester', source: 'ip' }), 'Manchester, UK');
  assert.equal(location.ukTown('London', 'Westminster'), 'London');
  assert.equal(location.ukTown(null, 'Glasgow City'), 'Glasgow');
  assert.equal(location.ukTown(null, 'City of Edinburgh'), 'Edinburgh');
  assert.equal(location.ukTown('South West', 'Bristol, City of'), 'Bristol');
});

test('pounds: prices, delivery fees and free-delivery thresholds', () => {
  assert.equal(formatMoney(1299, 'GBP'), '£1,299');
  assert.equal(formatMoney(4.5, 'GBP'), '£4.50');
  assert.equal(findMoneyInText('£3.95 delivery'), 3.95);
  assert.equal(findMoneyInText('Delivery GBP 4.99'), 4.99);
  assert.equal(parseShippingText('Free delivery over £50', { ...gb, price: 80 })?.cost, 0);
  const below = parseShippingText('Free delivery on orders over £50', { ...gb, price: 30 });
  assert.equal(below?.free, false);
  assert.equal(below?.threshold, 50);
  assert.equal(makeShipping(gb, 4.95).label, '£4.95 delivery');
});

test('UK prices already include VAT', () => {
  const tax = taxFor('GB', 250, "Barbour Men's Beaufort Wax Jacket");
  assert.equal(tax.mode, 'included');
  assert.equal(tax.amount, 0);
});

test('UK stores are recognized; short names only match exactly', () => {
  assert.equal(isKnownRetailer('Selfridges & Co'), true);
  assert.equal(isKnownRetailer('John Lewis & Partners'), true);
  assert.equal(isKnownRetailer('END.'), true);
  assert.equal(isKnownRetailer('Next'), true);
  assert.equal(isKnownRetailer('Next Day Bags'), false);
  assert.equal(isKnownRetailer('Marks & Spencer'), true);
  assert.equal(isSuspiciousStore('Harrods', 'harrods.com', 'GB'), false);
  assert.equal(isSuspiciousStore('Bagshop', 'bagshop.co.uk', 'GB'), false);
  assert.equal(isSuspiciousStore('Bagshop', 'bagshop.pt', 'GB'), true);
});

test('luxury price floors work in pounds', () => {
  assert.ok(luxuryFloorWarning('Chanel Classic Flap Bag', 150, 'GBP'));
  assert.equal(luxuryFloorWarning('Chanel Classic Flap Bag', 8500, 'GBP'), null);
  assert.equal(luxuryFloorWarning('Mulberry Bayswater Bag', 400, 'GBP'), null);
});
