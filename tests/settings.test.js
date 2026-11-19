import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, OPTIONS, sanitize, randomize, noiseParams } from '../js/settings.js';
import { PRESETS } from '../js/presets.js';

test('sanitize fills missing keys with defaults', () => {
  assert.deepEqual(sanitize({}), { ...DEFAULTS });
  assert.deepEqual(sanitize(null), { ...DEFAULTS });
});

test('sanitize drops the removed simplex type and unknown values', () => {
  const s = sanitize({ type: 'simplex', format: 'gif', cell: 'x', size: 999, invert: 'yes' });
  assert.equal(s.type, DEFAULTS.type);
  assert.equal(s.format, DEFAULTS.format);
  assert.equal(s.cell, DEFAULTS.cell);
  assert.equal(s.size, DEFAULTS.size);
  assert.equal(s.invert, DEFAULTS.invert);
});

test('sanitize clamps numbers to their ranges and rounds integers', () => {
  const s = sanitize({ contrast: -1, scale: 100, octaves: 3.6, seed: 12.4, gain: NaN });
  assert.equal(s.contrast, 0);
  assert.equal(s.scale, 32);
  assert.equal(s.octaves, 4);
  assert.equal(s.seed, 12);
  assert.equal(s.gain, DEFAULTS.gain);
});

test('randomize only produces allowed, tileable values', () => {
  let x = 0.123;
  const random = () => (x = (x * 9301 + 49297) % 233280 / 233280);
  for (let i = 0; i < 200; i++) {
    const r = randomize(random);
    assert.deepEqual(sanitize({ ...DEFAULTS, ...r }), { ...DEFAULTS, ...r });
    assert.ok(OPTIONS.type.includes(r.type));
  }
});

test('presets are valid settings', () => {
  for (const p of PRESETS) {
    const s = { ...DEFAULTS, ...p.settings };
    assert.deepEqual(sanitize(s), s, p.name);
  }
});

test('noiseParams excludes post-processing and view keys', () => {
  const p = noiseParams(DEFAULTS);
  assert.equal(p.contrast, undefined);
  assert.equal(p.format, undefined);
  assert.equal(p.type, DEFAULTS.type);
});
