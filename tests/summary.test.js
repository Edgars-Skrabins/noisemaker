import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../js/settings.js';
import { stepSummary } from '../js/summary.js';

const s = (patch) => ({ ...DEFAULTS, ...patch });

test('pattern summary names the type, scale and tiling', () => {
  assert.equal(stepSummary('pattern', DEFAULTS), 'Perlin · scale 4');
  assert.equal(stepSummary('pattern', s({ scale: 2.5, tileable: false })), 'Perlin · scale 2.5 · no tiling');
  assert.equal(stepSummary('pattern', s({ type: 'worley', cell: 'edges', scale: 6 })), 'Worley · F2 − F1 · scale 6');
  assert.equal(stepSummary('pattern', s({ type: 'white', tileable: false })), 'White');
});

test('detail summary names the fractal, octaves and warp', () => {
  assert.equal(stepSummary('detail', DEFAULTS), 'fBm · 5 octaves');
  assert.equal(stepSummary('detail', s({ fractal: 'ridged', octaves: 1, warp: 0.4 })), 'Ridged · 1 octave · warp 0.4');
  assert.equal(stepSummary('detail', s({ fractal: 'none', octaves: 7 })), 'No fractal');
  assert.equal(stepSummary('detail', s({ fractal: 'none', warp: 1.25 })), 'No fractal · warp 1.25');
});

test('tone summary lists only the adjustments that change the map', () => {
  assert.equal(stepSummary('tone', DEFAULTS), 'Auto-levels');
  assert.equal(stepSummary('tone', s({ normalize: false })), 'Unchanged');
  assert.equal(
    stepSummary('tone', s({ contrast: 1.2, brightness: -0.12, steps: 4, invert: true })),
    'Auto-levels · contrast 1.2 · brightness −0.12 · 4 levels · Inverted',
  );
  assert.equal(stepSummary('tone', s({ normalize: false, brightness: 0.5 })), 'brightness +0.5');
});

test('export summary shows the size, format and quality for lossy formats', () => {
  assert.equal(stepSummary('export', DEFAULTS), '1024 px · PNG');
  assert.equal(stepSummary('export', s({ size: 256, format: 'r16' })), '256 px · RAW16');
  assert.equal(stepSummary('export', s({ format: 'webp', quality: 0.8 })), '1024 px · WebP 80%');
  assert.equal(stepSummary('export', s({ format: 'jpeg' })), '1024 px · JPEG 92%');
});
