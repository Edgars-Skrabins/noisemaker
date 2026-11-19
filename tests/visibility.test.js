import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches } from '../js/visibility.js';

const state = { type: 'worley', fractal: 'none', format: 'webp', tileable: true };

test('equality matches the current value', () => {
  assert.equal(matches('type=worley', state), true);
  assert.equal(matches('type=perlin', state), false);
});

test('inequality negates the match', () => {
  assert.equal(matches('type!=white', state), true);
  assert.equal(matches('fractal!=none', state), false);
});

test('a bar allows any of several values', () => {
  assert.equal(matches('format=jpg|jpeg|webp', state), true);
  assert.equal(matches('format=png|bmp', state), false);
  assert.equal(matches('format!=jpg|webp', state), false);
});

test('an ampersand requires every clause', () => {
  assert.equal(matches('type=worley&tileable=true', state), true);
  assert.equal(matches('type=worley&fractal!=none', state), false);
});

test('values are compared as strings', () => {
  assert.equal(matches('tileable=true', state), true);
  assert.equal(matches('tileable=false', state), false);
});
