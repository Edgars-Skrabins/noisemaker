import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decimalsFor, formatNumber, commitNumber } from '../js/fields.js';

test('decimalsFor counts the step decimals', () => {
  assert.equal(decimalsFor(1), 0);
  assert.equal(decimalsFor(0.5), 1);
  assert.equal(decimalsFor(0.05), 2);
});

test('formatNumber uses the step precision', () => {
  assert.equal(formatNumber(4, 0.5), '4.0');
  assert.equal(formatNumber(0.5, 0.01), '0.50');
  assert.equal(formatNumber(7, 1), '7');
});

test('commitNumber clamps to the range', () => {
  assert.equal(commitNumber('99', 1, 32, 0.5, 4), 32);
  assert.equal(commitNumber('-3', 0, 3, 0.05, 1), 0);
});

test('commitNumber snaps to the step grid starting at min', () => {
  assert.equal(commitNumber('4.3', 1, 32, 0.5, 4), 4.5);
  assert.equal(commitNumber('2.33', 1.2, 4, 0.05, 2), 2.35);
  assert.equal(commitNumber('5.6', 1, 10, 1, 5), 6);
  assert.equal(commitNumber('0.123', -0.5, 0.5, 0.01, 0), 0.12);
});

test('commitNumber accepts a comma decimal separator and surrounding spaces', () => {
  assert.equal(commitNumber(' 1,5 ', 0, 3, 0.05, 1), 1.5);
});

test('commitNumber falls back on invalid input', () => {
  assert.equal(commitNumber('', 0, 3, 0.05, 1.2), 1.2);
  assert.equal(commitNumber('abc', 0, 3, 0.05, 1.2), 1.2);
  assert.equal(commitNumber('-', 0, 3, 0.05, 1.2), 1.2);
});
