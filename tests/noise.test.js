import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSampler, generate, octaveFrequencies } from '../js/noise.js';
import { DEFAULTS, noiseParams } from '../js/settings.js';

const params = (patch) => noiseParams({ ...DEFAULTS, ...patch });

const TILEABLE_CASES = [
  { type: 'perlin', fractal: 'fbm' },
  { type: 'perlin', fractal: 'ridged', scale: 3.5, lacunarity: 2.3 },
  { type: 'perlin', fractal: 'billow', warp: 1.8 },
  { type: 'value', fractal: 'fbm', warp: 0.6 },
  { type: 'value', fractal: 'none', scale: 7 },
  { type: 'worley', cell: 'f1', fractal: 'none', scale: 8 },
  { type: 'worley', cell: 'edges', metric: 'manhattan', fractal: 'fbm', octaves: 4 },
  { type: 'worley', cell: 'cells', metric: 'chebyshev', jitter: 0.4, warp: 1.1 },
  { type: 'worley', cell: 'f2', fractal: 'billow', scale: 1 },
];

test('same seed produces identical output', () => {
  for (const c of TILEABLE_CASES) {
    const a = generate(32, 32, params(c));
    const b = generate(32, 32, params(c));
    assert.deepEqual(a, b);
  }
});

test('different seeds produce different output', () => {
  for (const type of ['perlin', 'value', 'worley', 'white']) {
    const a = generate(32, 32, params({ type, seed: 1 }));
    const b = generate(32, 32, params({ type, seed: 2 }));
    assert.notDeepEqual(a, b, type);
  }
});

test('output stays within 0..1 with and without auto-levels', () => {
  for (const c of [...TILEABLE_CASES, { type: 'white' }]) {
    for (const normalize of [true, false]) {
      const out = generate(48, 48, params({ ...c, normalize }));
      for (const v of out) assert.ok(v >= 0 && v <= 1, `${JSON.stringify(c)} ${v}`);
    }
  }
});

test('auto-levels spans the full 0..1 range', () => {
  const out = generate(64, 64, params({ normalize: true }));
  assert.equal(Math.min(...out), 0);
  assert.equal(Math.max(...out), 1);
});

test('tileable maps continue across left/right and top/bottom edges', () => {
  for (const c of TILEABLE_CASES) {
    const sample = createSampler(params({ ...c, tileable: true }));
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      assert.ok(Math.abs(sample(0, t) - sample(1, t)) < 1e-9, `x edge ${JSON.stringify(c)} at ${t}`);
      assert.ok(Math.abs(sample(t, 0) - sample(t, 1)) < 1e-9, `y edge ${JSON.stringify(c)} at ${t}`);
    }
  }
});

test('generated tile wraps smoothly from last column into first', () => {
  const w = 128;
  const p = params({ type: 'perlin', fractal: 'fbm', normalize: false });
  const out = generate(w, w, p);
  let edge = 0;
  let inner = 0;
  for (let y = 0; y < w; y++) {
    edge += Math.abs(out[y * w + w - 1] - out[y * w]);
    inner += Math.abs(out[y * w + w / 2] - out[y * w + w / 2 - 1]);
  }
  assert.ok(edge < inner * 2, `edge ${edge} inner ${inner}`);
});

test('non-tileable maps do not repeat at the edges', () => {
  const sample = createSampler(params({ type: 'perlin', scale: 3.5, tileable: false }));
  let diff = 0;
  for (let i = 0; i < 16; i++) diff += Math.abs(sample(0, i / 16) - sample(1, i / 16));
  assert.ok(diff > 1e-3);
});

test('tiled octave frequencies are integers that strictly increase', () => {
  assert.deepEqual(octaveFrequencies(1, 1.2, 6, true), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(octaveFrequencies(4, 2, 4, true), [4, 8, 16, 32]);
  for (const [scale, lac] of [[1, 1.2], [2.5, 1.35], [7.5, 1.6], [32, 4]]) {
    const f = octaveFrequencies(scale, lac, 10, true);
    for (let i = 0; i < f.length; i++) {
      assert.ok(Number.isInteger(f[i]));
      if (i > 0) assert.ok(f[i] > f[i - 1], `${scale} ${lac} ${f}`);
    }
  }
});

test('non-tiled octave frequencies follow lacunarity exactly', () => {
  const f = octaveFrequencies(1.5, 1.2, 3, false);
  assert.ok(Math.abs(f[2] - 1.5 * 1.2 * 1.2) < 1e-12);
});

test('white noise preview is a subsample of the export resolution', () => {
  const big = generate(256, 256, params({ type: 'white', size: 256 }));
  const small = generate(64, 64, params({ type: 'white', size: 256 }));
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) assert.equal(small[y * 64 + x], big[y * 4 * 256 + x * 4]);
  }
});
