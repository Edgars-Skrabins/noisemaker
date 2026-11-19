import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HELP } from '../js/help.js';
import { DEFAULTS } from '../js/settings.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const attrs = (name) => new Set([...html.matchAll(new RegExp(`${name}="([^"]+)"`, 'g'))].map((m) => m[1]));
const dataKeys = attrs('data-key');
const helpKeys = attrs('data-help');

test('the page has settings to check', () => {
  assert.ok(dataKeys.size >= 20);
});

test('every setting control has a help text', () => {
  for (const key of dataKeys) {
    assert.equal(typeof HELP[key], 'string', key);
    assert.ok(HELP[key].trim().length > 20, key);
  }
});

test('every setting control has a label with an info button', () => {
  for (const key of dataKeys) assert.ok(helpKeys.has(key), key);
});

test('every info button refers to an existing help text', () => {
  for (const key of helpKeys) assert.ok(key in HELP, key);
});

test('help texts only describe real settings', () => {
  for (const key of Object.keys(HELP)) assert.ok(key in DEFAULTS, key);
});
