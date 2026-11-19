import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postProcess } from '../js/postprocess.js';

const ADJUST = { contrast: 1, brightness: 0, steps: 1, invert: false };
const ramp = (n) => Float32Array.from({ length: n }, (_, i) => i / (n - 1));

test('contrast 0 gives a flat mid-gray map', () => {
  const { rgba, height } = postProcess(ramp(16), 4, 4, { ...ADJUST, contrast: 0 });
  for (const v of height) assert.equal(v, 0.5);
  for (let i = 0; i < 16; i++) assert.equal(rgba[i * 4], 128);
});

test('contrast 0 with brightness shifts the flat level', () => {
  const { height } = postProcess(ramp(4), 2, 2, { ...ADJUST, contrast: 0, brightness: 0.25 });
  for (const v of height) assert.equal(v, 0.75);
});

test('output is grayscale with opaque alpha', () => {
  const { rgba } = postProcess(ramp(9), 3, 3, ADJUST);
  for (let i = 0; i < 9; i++) {
    assert.equal(rgba[i * 4], rgba[i * 4 + 1]);
    assert.equal(rgba[i * 4], rgba[i * 4 + 2]);
    assert.equal(rgba[i * 4 + 3], 255);
  }
});

test('invert flips values', () => {
  const data = Float32Array.from([0, 0.25, 1, 0.5]);
  const { height } = postProcess(data, 2, 2, { ...ADJUST, invert: true });
  assert.deepEqual([...height], [1, 0.75, 0, 0.5]);
});

test('posterize quantises to the given number of levels', () => {
  const { height } = postProcess(ramp(100), 10, 10, { ...ADJUST, steps: 4 });
  const levels = [...new Set(height)].sort((a, b) => a - b);
  assert.equal(levels.length, 4);
  assert.equal(levels[0], 0);
  assert.equal(levels[3], 1);
});

test('brightness and contrast clamp to 0..1', () => {
  const { height } = postProcess(ramp(16), 4, 4, { ...ADJUST, contrast: 3, brightness: 0.5 });
  for (const v of height) assert.ok(v >= 0 && v <= 1);
  assert.equal(height[15], 1);
});
