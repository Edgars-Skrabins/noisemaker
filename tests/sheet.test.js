import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHEET_FRAMES, makeSheet, syncSheet, shuffleSheet } from '../js/sheet.js';

function seq(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('makeSheet puts the current seed first and fills unique new seeds', () => {
  const seeds = makeSheet(1337);
  assert.equal(seeds.length, SHEET_FRAMES);
  assert.equal(seeds[0], 1337);
  assert.equal(new Set(seeds).size, SHEET_FRAMES);
});

test('makeSheet skips random seeds that repeat or equal the current one', () => {
  const seeds = makeSheet(99999, seq(0.1, 0.2, 0.2, 0.3, 0.4));
  assert.deepEqual(seeds, [99999, 199999, 299999, 399999]);
});

test('syncSheet keeps the sheet when the seed is on it and replaces the first frame otherwise', () => {
  const seeds = [1, 2, 3, 4];
  assert.equal(syncSheet(seeds, 3), seeds);
  assert.deepEqual(syncSheet(seeds, 9), [9, 2, 3, 4]);
  assert.deepEqual(seeds, [1, 2, 3, 4]);
});

test('shuffleSheet keeps the current seed in its frame and replaces the others', () => {
  const seeds = [10, 20, 30, 40];
  const next = shuffleSheet(seeds, 30);
  assert.equal(next.length, SHEET_FRAMES);
  assert.equal(next[2], 30);
  assert.equal(new Set(next).size, SHEET_FRAMES);
  for (const s of [10, 20, 40]) assert.ok(!next.includes(s));
});

test('shuffleSheet puts a seed that is not on the sheet in the first frame', () => {
  const next = shuffleSheet([10, 20, 30, 40], 77);
  assert.equal(next[0], 77);
  assert.equal(new Set(next).size, SHEET_FRAMES);
});
