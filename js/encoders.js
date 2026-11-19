const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tga: 'image/x-tga',
  r16: 'application/octet-stream',
};

export function mimeFor(format) {
  return MIME[format];
}

export function encodeBMP(rgba, w, h) {
  const row = (w * 3 + 3) & ~3;
  const size = 54 + row * h;
  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  dv.setUint8(0, 0x42);
  dv.setUint8(1, 0x4d);
  dv.setUint32(2, size, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  dv.setUint32(34, row * h, true);
  dv.setInt32(38, 2835, true);
  dv.setInt32(42, 2835, true);
  const px = new Uint8Array(buf);
  for (let y = 0; y < h; y++) {
    const base = 54 + (h - 1 - y) * row;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = base + x * 3;
      px[d] = rgba[s + 2];
      px[d + 1] = rgba[s + 1];
      px[d + 2] = rgba[s];
    }
  }
  return px;
}

export function encodeTGA(rgba, w, h) {
  const buf = new Uint8Array(18 + w * h * 4);
  buf[2] = 2;
  buf[12] = w & 255;
  buf[13] = w >> 8;
  buf[14] = h & 255;
  buf[15] = h >> 8;
  buf[16] = 32;
  buf[17] = 0x28;
  for (let i = 0, n = w * h; i < n; i++) {
    const s = i * 4;
    const d = 18 + s;
    buf[d] = rgba[s + 2];
    buf[d + 1] = rgba[s + 1];
    buf[d + 2] = rgba[s];
    buf[d + 3] = rgba[s + 3];
  }
  return buf;
}

export function encodeR16(height) {
  const buf = new ArrayBuffer(height.length * 2);
  const dv = new DataView(buf);
  for (let i = 0; i < height.length; i++) dv.setUint16(i * 2, Math.round(height[i] * 65535), true);
  return new Uint8Array(buf);
}
