import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZOOM_STEPS, fitZoom, zoomIn, zoomOut, formatZoom, pointerToPixel } from '../js/view.js';

test('fitZoom picks the largest zoom that fits both axes', () => {
  assert.equal(fitZoom(1000, 600, 1024, 1024, 0), 600 / 1024);
  assert.equal(fitZoom(1040, 1040, 1024, 1024, 8), 1);
  assert.equal(fitZoom(400, 900, 2048, 2048, 0), 400 / 2048);
});

test('fitZoom stays within the zoom steps and survives bad input', () => {
  assert.equal(fitZoom(100000, 100000, 128, 128), ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  assert.equal(fitZoom(10, 10, 4096, 4096, 20), ZOOM_STEPS[0]);
  assert.equal(fitZoom(500, 500, 0, 0), 1);
});

test('zoomIn and zoomOut move to the neighbouring step', () => {
  assert.equal(zoomIn(1), 1.5);
  assert.equal(zoomOut(1), 2 / 3);
  assert.equal(zoomIn(0.4), 0.5);
  assert.equal(zoomOut(0.4), 1 / 3);
  assert.equal(zoomIn(16), 16);
  assert.equal(zoomOut(ZOOM_STEPS[0]), ZOOM_STEPS[0]);
});

test('formatZoom shows readable percentages', () => {
  assert.equal(formatZoom(1), '100%');
  assert.equal(formatZoom(0.5), '50%');
  assert.equal(formatZoom(1 / 3), '33.3%');
  assert.equal(formatZoom(0.0625), '6.25%');
  assert.equal(formatZoom(16), '1600%');
});

test('pointerToPixel maps display coordinates to source pixels', () => {
  assert.deepEqual(pointerToPixel(0, 0, 512, 512, 256, 256), { x: 0, y: 0 });
  assert.deepEqual(pointerToPixel(511.9, 256, 512, 512, 256, 256), { x: 255, y: 128 });
  assert.equal(pointerToPixel(-1, 10, 512, 512, 256, 256), null);
  assert.equal(pointerToPixel(10, 512, 512, 512, 256, 256), null);
});

test('pointerToPixel wraps into one tile when the preview is tiled', () => {
  assert.deepEqual(pointerToPixel(300, 100, 512, 512, 128, 128, 2), { x: 22, y: 50 });
  assert.deepEqual(pointerToPixel(256, 256, 512, 512, 128, 128, 2), { x: 0, y: 0 });
});
