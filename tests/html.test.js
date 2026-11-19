import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, OPTIONS, RANGES } from '../js/settings.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const tags = (name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

test('slider limits match the setting ranges', () => {
  const ranges = tags('input').filter((t) => attr(t, 'type') === 'range' && attr(t, 'data-key'));
  assert.ok(ranges.length > 5);
  for (const t of ranges) {
    const key = attr(t, 'data-key');
    assert.ok(RANGES[key], key);
    assert.deepEqual([Number(attr(t, 'min')), Number(attr(t, 'max'))], RANGES[key], key);
  }
});

test('select options match the allowed setting values', () => {
  const selects = [...html.matchAll(/<select\b[^>]*data-key="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)];
  assert.ok(selects.length >= 4);
  for (const [, key, body] of selects) {
    const values = [...body.matchAll(/<option\b[^>]*value="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(values, OPTIONS[key].map(String), key);
  }
});

test('radio choices match the allowed setting values', () => {
  const groups = {};
  for (const t of tags('input').filter((x) => attr(x, 'type') === 'radio' && attr(x, 'data-key'))) {
    (groups[attr(t, 'data-key')] ||= []).push(attr(t, 'value'));
  }
  assert.ok(Object.keys(groups).length >= 2);
  for (const [key, values] of Object.entries(groups)) assert.deepEqual(values, OPTIONS[key], key);
});

test('visibility rules only refer to real settings', () => {
  const rules = [...html.matchAll(/data-show="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    for (const clause of rule.split('&')) {
      const key = clause.split(/!?=/)[0];
      assert.ok(key in DEFAULTS, `${rule}: ${key}`);
    }
  }
});

test('the page sets a Content-Security-Policy and has no inline scripts or styles', () => {
  const csp = tags('meta').find((t) => attr(t, 'http-equiv') === 'Content-Security-Policy');
  assert.ok(csp);
  assert.match(attr(csp, 'content'), /script-src 'self'/);
  for (const t of tags('script')) assert.ok(attr(t, 'src'), t);
  assert.doesNotMatch(html, /\sstyle="/);
  assert.doesNotMatch(html, /\son[a-z]+="/);
});
