import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretDetails, makeContext, parseDeliveryWindow, parseReturns, parseShippingText } from '../lib/delivery';

// Thursday, Oct 29 2026, 5pm in Arizona.
const NOW = new Date('2026-10-30T00:00:00Z');
const us = (price?: number) => makeContext('US', 'America/Phoenix', price, NOW);

test('weekday-only notes resolve to the next occurrence', () => {
  const d = parseDeliveryWindow('Free delivery by Mon', us());
  assert.equal(d?.minDate, '2026-11-02');
  assert.equal(d?.minDays, 4);
  assert.equal(d?.speed, 'standard');
});

test('explicit dates win over weekday names', () => {
  const d = parseDeliveryWindow('Free delivery by Tue, Nov 3', us());
  assert.equal(d?.maxDate, '2026-11-03');
  assert.equal(d?.maxDays, 5);
  assert.equal(d?.label, 'Arrives Tue, Nov 3');
});

test('Google "Get it by" notes with cost in parentheses', () => {
  const ctx = us();
  const d = parseDeliveryWindow('Get it by Wed (Free)', ctx);
  assert.equal(d?.minDate, '2026-11-04');
  const s = parseShippingText('Get it by Wed (Free)', ctx);
  assert.equal(s?.free, true);
  const today = parseDeliveryWindow('Get it today ($10)', ctx);
  assert.equal(today?.maxDays, 0);
  assert.equal(today?.label, 'Arrives today');
  assert.equal(parseShippingText('Get it today ($10)', ctx)?.cost, 10);
});

test('date ranges, including across months and day-first formats', () => {
  const a = parseDeliveryWindow('Delivery between Oct 30 - Nov 2', us());
  assert.deepEqual([a?.minDate, a?.maxDate], ['2026-10-30', '2026-11-02']);
  const b = parseDeliveryWindow('Free delivery Nov 3 – 5', us());
  assert.deepEqual([b?.minDays, b?.maxDays], [5, 7]);
  assert.equal(b?.label, 'Arrives Nov 3–5');
  const ind = makeContext('IN', 'Asia/Kolkata', undefined, NOW);
  const c = parseDeliveryWindow('Delivery 3 - 5 Nov', ind);
  assert.deepEqual([c?.minDate, c?.maxDate], ['2026-11-03', '2026-11-05']);
  const d = parseDeliveryWindow('Free delivery by 31 Oct', ind);
  assert.equal(d?.maxDate, '2026-10-31');
});

test('relative speeds', () => {
  assert.equal(parseDeliveryWindow('Next-day delivery $16.94', us())?.maxDays, 1);
  assert.equal(parseShippingText('Next-day delivery $16.94', us())?.cost, 16.94);
  assert.equal(parseDeliveryWindow('Free 2-day delivery', us())?.maxDays, 2);
  assert.equal(parseDeliveryWindow('Arrives tomorrow', us())?.label, 'Arrives tomorrow');
  const biz = parseDeliveryWindow('Delivers in 3-5 business days', us());
  assert.deepEqual([biz?.minDate, biz?.maxDate], ['2026-11-03', '2026-11-05']);
});

test('shipping costs and free-shipping thresholds', () => {
  assert.equal(parseShippingText('$4.99 delivery', us())?.cost, 4.99);
  assert.equal(parseDeliveryWindow('$4.99 delivery', us()), null);
  const over = parseShippingText('Free delivery on $75+', us(80));
  assert.equal(over?.free, true);
  const under = parseShippingText('Free delivery on $75+', us(50));
  assert.equal(under?.cost, null);
  assert.equal(under?.threshold, 75);
  assert.equal(under?.label, 'Free shipping over $75');
  const ordersOver = parseShippingText('Free shipping on orders over $50', us(30));
  assert.equal(ordersOver?.threshold, 50);
  const dateNotThreshold = parseShippingText('Free delivery on Nov 4', us(30));
  assert.equal(dateNotThreshold?.free, true);
  assert.equal(parseShippingText('Free delivery (2-3 days)', us())?.free, true);
  const ae = makeContext('AE', 'Asia/Dubai', 100, NOW);
  assert.equal(parseShippingText('AED 10 delivery', ae)?.cost, 10);
  const ind = makeContext('IN', 'Asia/Kolkata', 300, NOW);
  assert.equal(parseShippingText('₹40 delivery', ind)?.cost, 40);
  assert.equal(parseShippingText('Free delivery above ₹499', ind)?.threshold, 499);
});

test('returns notes', () => {
  assert.deepEqual(parseReturns(['Free 30-day returns']), { label: 'Free 30-day returns', free: true, days: 30 });
  assert.equal(parseReturns(['Not eligible for returns'])?.none, true);
  assert.equal(parseReturns(['15-day returns'])?.days, 15);
});

test('interpreting a full list of store notes', () => {
  const r = interpretDetails(['In stock online', '$4 delivery', '15-day returns'], us(20));
  assert.equal(r.shipping?.cost, 4);
  assert.equal(r.returns?.days, 15);
  assert.equal(r.inStock, true);
  assert.equal(r.delivery.speed, 'unknown');
  const r2 = interpretDetails(['In stock online', 'Free delivery by Tue on orders $59+', 'Free 90-day returns'], us(80));
  assert.equal(r2.shipping?.free, true);
  assert.equal(r2.delivery.minDate, '2026-11-03');
  assert.equal(r2.returns?.days, 90);
});

test('year rollover for dates near New Year', () => {
  const dec = makeContext('US', 'America/New_York', undefined, new Date('2026-12-28T15:00:00Z'));
  const d = parseDeliveryWindow('Arrives Jan 3', dec);
  assert.equal(d?.maxDate, '2027-01-03');
  assert.equal(d?.maxDays, 6);
});
