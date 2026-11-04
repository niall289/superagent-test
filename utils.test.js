const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

test('calculateVat is available as a global in a browser-like script context', () => {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(__dirname, 'utils.js'), 'utf8');

  vm.runInContext(source, context);

  assert.equal(typeof context.calculateVat, 'function');
  assert.equal(context.calculateVat(100), 123);
});
