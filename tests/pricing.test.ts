import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMoneyInText, formatMoney, parseMoney } from '../lib/money';
import { classifyItem, estimateUsTax, taxFor } from '../lib/tax';
import { detectBrand, matchScore, productKey } from '../lib/text';
import { isBrandStore, isResaleStore, looksUsed } from '../lib/stores';

test('parsing prices', () => {
  assert.equal(parseMoney('$1,299.99'), 1299.99);
  assert.equal(parseMoney('₹1,23,456'), 123456);
  assert.equal(parseMoney('AED 1,250.00'), 1250);
  assert.equal(parseMoney('+ $4.00'), 4);
  assert.equal(parseMoney('Free'), null);
  assert.equal(findMoneyInText('Next-day delivery $16.94'), 16.94);
  assert.equal(findMoneyInText('Delivery 25 AED'), 25);
  assert.equal(findMoneyInText('Ships in 2 days'), null);
});

test('formatting prices per currency', () => {
  assert.equal(formatMoney(98, 'USD'), '$98');
  assert.equal(formatMoney(97.5, 'USD'), '$97.50');
  assert.equal(formatMoney(123456, 'INR'), '₹1,23,456');
  assert.match(formatMoney(1250, 'AED'), /AED\s?1,250/);
});

test('US sales tax estimates by state, with clothing rules', () => {
  assert.equal(estimateUsTax(100, "Levi's 501 jeans", 'AZ').amount, 8.54);
  assert.equal(estimateUsTax(100, 'Nike Air Force 1 sneakers', 'PA').amount, 0);
  assert.equal(estimateUsTax(100, 'Coach Tabby shoulder bag', 'PA').amount, 6.34);
  assert.equal(estimateUsTax(80, 'Cotton t-shirt', 'NY', '10001').amount, 0);
  assert.equal(estimateUsTax(80, 'Cotton t-shirt', 'NY', '14201').amount, 3.63);
  assert.equal(estimateUsTax(200, 'Wool coat', 'MA').amount, 1.56);
  assert.equal(estimateUsTax(200, 'Wool coat', 'OR').mode, 'none');
  assert.equal(estimateUsTax(200, 'Wool coat').mode, 'unknown');
  assert.equal(taxFor('AE', 100, 'bag').mode, 'included');
  assert.equal(classifyItem('Ray-Ban Wayfarer sunglasses'), 'accessory');
  assert.equal(classifyItem('Earrings'), 'accessory');
  assert.equal(classifyItem('Spring dress'), 'clothing');
});

test('matching titles to searches', () => {
  assert.equal(matchScore('coach tabby 26', 'Coach Tabby Shoulder Bag 26 in Signature Canvas'), 1);
  assert.ok(matchScore('coach tabby 26', 'Coach Tabby Shoulder Bag 20') < 1);
  assert.equal(matchScore('nike air force 1 womens', "Nike Women's Air Force 1 '07"), 1);
  assert.ok(matchScore('nike air force 1 womens', "Nike Men's Air Force 1 '07") < 1);
  assert.equal(matchScore('rayban wayfarer', 'Ray-Ban RB2140 Original Wayfarer'), 1);
});

test('brands, product keys and stores', () => {
  assert.equal(detectBrand('Coach Tabby Shoulder Bag 26'), 'Coach');
  assert.equal(detectBrand("Levi's Men's 501 Original Fit Jeans"), "Levi's");
  assert.equal(detectBrand('Kate Spade New York Knott Satchel'), 'Kate Spade New York');
  assert.equal(detectBrand('Plain cotton tee'), undefined);
  assert.equal(productKey('US', 'Coach Tabby Bag 26 Black'), productKey('US', 'black coach TABBY bag 26'));
  assert.equal(productKey('US', 'x', '7349398578013612374'), 'US:g:7349398578013612374');
  assert.ok(isResaleStore('The RealReal'));
  assert.ok(isResaleStore('Fashionphile'));
  assert.ok(!isResaleStore('Nordstrom'));
  assert.ok(looksUsed('Coach Tabby bag - Pre-owned'));
  assert.ok(looksUsed('Coach Tabby', 'used'));
  assert.ok(!looksUsed('Coach Tabby', 'New with tags'));
  assert.ok(isBrandStore('Coach', 'Coach'));
  assert.ok(isBrandStore('Coach Outlet', 'Coach'));
  assert.ok(!isBrandStore('Nordstrom', 'Coach'));
});
