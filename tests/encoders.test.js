import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeBMP, encodeTGA, encodeR16, mimeFor } from '../js/encoders.js';
import { OPTIONS } from '../js/settings.js';

function image(w, h) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = i;
    rgba[i * 4 + 1] = i;
    rgba[i * 4 + 2] = i;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

test('BMP has a valid 24-bit header and padded rows', () => {
  const w = 5;
  const h = 3;
  const buf = encodeBMP(image(w, h), w, h);
  const dv = new DataView(buf.buffer);
  const row = 16;
  assert.equal(buf.length, 54 + row * h);
  assert.equal(String.fromCharCode(buf[0], buf[1]), 'BM');
  assert.equal(dv.getUint32(2, true), buf.length);
  assert.equal(dv.getUint32(10, true), 54);
  assert.equal(dv.getUint32(14, true), 40);
  assert.equal(dv.getInt32(18, true), w);
  assert.equal(dv.getInt32(22, true), h);
  assert.equal(dv.getUint16(28, true), 24);
  assert.equal(dv.getUint32(34, true), row * h);
});

test('BMP stores rows bottom-up', () => {
  const w = 2;
  const h = 2;
  const buf = encodeBMP(image(w, h), w, h);
  const row = 8;
  assert.deepEqual([buf[54], buf[57]], [2, 3]);
  assert.deepEqual([buf[54 + row], buf[57 + row]], [0, 1]);
});

test('TGA has a 32-bit uncompressed header and top-left origin', () => {
  const w = 300;
  const h = 2;
  const buf = encodeTGA(image(w, h), w, h);
  assert.equal(buf.length, 18 + w * h * 4);
  assert.equal(buf[2], 2);
  assert.equal(buf[12] | (buf[13] << 8), w);
  assert.equal(buf[14] | (buf[15] << 8), h);
  assert.equal(buf[16], 32);
  assert.equal(buf[17], 0x28);
  assert.equal(buf[18 + 3], 255);
});

test('RAW16 writes little-endian 16-bit samples', () => {
  const buf = encodeR16(Float32Array.from([0, 1, 0.5]));
  const dv = new DataView(buf.buffer);
  assert.equal(buf.length, 6);
  assert.equal(dv.getUint16(0, true), 0);
  assert.equal(dv.getUint16(2, true), 65535);
  assert.equal(dv.getUint16(4, true), 32768);
});

test('every export format has a MIME type', () => {
  for (const f of OPTIONS.format) assert.ok(mimeFor(f), f);
  assert.equal(mimeFor('jpg'), 'image/jpeg');
});
