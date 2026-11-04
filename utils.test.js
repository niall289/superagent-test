const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateVat } = require('./utils.js');

test('calculateVat adds 23% VAT to an amount', () => {
  assert.equal(calculateVat(0), 0);
  assert.equal(calculateVat(10), 12.3);
  assert.equal(calculateVat(50), 61.5);
  assert.equal(calculateVat(100), 123);
});

test('calculateVat rounds the gross amount to the nearest cent', () => {
  assert.equal(calculateVat(19.99), 24.59);
  assert.equal(calculateVat(123.45), 151.84);
});
