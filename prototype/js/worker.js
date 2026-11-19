const INV32 = 1 / 4294967296;
const GX = new Float64Array(16);
const GY = new Float64Array(16);
for (let k = 0; k < 16; k++) {
  GX[k] = Math.cos((k * Math.PI * 2) / 16);
  GY[k] = Math.sin((k * Math.PI * 2) / 16);
}
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function mix(h) {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return h ^ (h >>> 16);
}

function hash(x, y, s) {
  return mix(mix(mix(s) ^ x) + y) >>> 0;
}

function wrap(a, p) {
  return p ? ((a % p) + p) % p : a;
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function valueNoise(x, y, s, p) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const u = fade(x - x0);
  const v = fade(y - y0);
  const ax = wrap(x0, p);
  const bx = wrap(x0 + 1, p);
  const ay = wrap(y0, p);
  const by = wrap(y0 + 1, p);
  const a = hash(ax, ay, s) * INV32;
  const b = hash(bx, ay, s) * INV32;
  const c = hash(ax, by, s) * INV32;
  const d = hash(bx, by, s) * INV32;
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

function perlin(x, y, s, p) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ix0 = wrap(x0, p);
  const ix1 = wrap(x0 + 1, p);
  const iy0 = wrap(y0, p);
  const iy1 = wrap(y0 + 1, p);
  const g00 = hash(ix0, iy0, s) & 15;
  const g10 = hash(ix1, iy0, s) & 15;
  const g01 = hash(ix0, iy1, s) & 15;
  const g11 = hash(ix1, iy1, s) & 15;
  const n00 = GX[g00] * fx + GY[g00] * fy;
  const n10 = GX[g10] * (fx - 1) + GY[g10] * fy;
  const n01 = GX[g01] * fx + GY[g01] * (fy - 1);
  const n11 = GX[g11] * (fx - 1) + GY[g11] * (fy - 1);
  const u = fade(fx);
  const v = fade(fy);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.4142;
}

function simplex(x, y, s) {
  const t = (x + y) * F2;
  const i = Math.floor(x + t);
  const j = Math.floor(y + t);
  const t0 = (i + j) * G2;
  const x0 = x - (i - t0);
  const y0 = y - (j - t0);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = 1 - i1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  let n = 0;
  let a = 0.5 - x0 * x0 - y0 * y0;
  if (a > 0) {
    const g = hash(i, j, s) & 15;
    a *= a;
    n += a * a * (GX[g] * x0 + GY[g] * y0);
  }
  let b = 0.5 - x1 * x1 - y1 * y1;
  if (b > 0) {
    const g = hash(i + i1, j + j1, s) & 15;
    b *= b;
    n += b * b * (GX[g] * x1 + GY[g] * y1);
  }
  let c = 0.5 - x2 * x2 - y2 * y2;
  if (c > 0) {
    const g = hash(i + 1, j + 1, s) & 15;
    c *= c;
    n += c * c * (GX[g] * x2 + GY[g] * y2);
  }
  return n * 99;
}

function worley(x, y, s, p, o) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const hx = wrap(cx, p);
      const hy = wrap(cy, p);
      const h1 = hash(hx, hy, s);
      const h2 = hash(hx, hy, s + 7919);
      const px = cx + 0.5 + (h1 * INV32 - 0.5) * o.jitter;
      const py = cy + 0.5 + (h2 * INV32 - 0.5) * o.jitter;
      const ddx = Math.abs(px - x);
      const ddy = Math.abs(py - y);
      let d;
      if (o.metric === 'manhattan') d = (ddx + ddy) * 0.7071;
      else if (o.metric === 'chebyshev') d = Math.max(ddx, ddy);
      else d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = h1;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  if (o.cell === 'f2') return Math.min(1, f2 * 1.4 - 1);
  if (o.cell === 'edges') return Math.min(1, (f2 - f1) * 3 - 1);
  if (o.cell === 'cells') return id * INV32 * 2 - 1;
  return Math.min(1, f1 * 2 - 1);
}

function createBase(p) {
  if (p.type === 'value') return valueNoise;
  if (p.type === 'simplex') return simplex;
  if (p.type === 'worley') {
    const o = { metric: p.metric, cell: p.cell, jitter: p.jitter };
    return (x, y, s, per) => worley(x, y, s, per, o);
  }
  return perlin;
}

function makeFractal(p, base, tile) {
  const octaves = p.fractal === 'none' ? 1 : Math.max(1, p.octaves | 0);
  const mode = p.fractal;
  return (u, v, seed) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let freq = p.scale;
    for (let i = 0; i < octaves; i++) {
      const f = tile ? Math.max(1, Math.round(freq)) : freq;
      let n = base(u * f, v * f, seed + i * 7919, tile ? f : 0);
      if (mode === 'ridged') {
        n = 1 - Math.abs(n);
        n = n * n * 2 - 1;
      } else if (mode === 'billow') {
        n = Math.abs(n) * 2 - 1;
      }
      sum += n * amp;
      norm += amp;
      amp *= p.gain;
      freq *= p.lacunarity;
    }
    return sum / norm;
  };
}

function generate(id, w, h, p) {
  const out = new Float32Array(w * h);
  const seed = p.seed | 0;
  const report = w * h >= 1 << 20;

  if (p.type === 'white') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) out[y * w + x] = hash(x, y, seed) * INV32;
    }
    return out;
  }

  const tile = p.tileable && p.type !== 'simplex';
  const fbm = makeFractal(p, createBase(p), tile);
  const warp = p.warp;
  const warpBase = p.type === 'simplex' ? simplex : perlin;
  const warpFbm = warp > 0
    ? makeFractal({ ...p, fractal: 'fbm', octaves: Math.min(p.octaves, 4) }, warpBase, tile)
    : null;

  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < h; y++) {
    const v0 = y / h;
    for (let x = 0; x < w; x++) {
      let u = x / w;
      let v = v0;
      if (warpFbm) {
        const a = warpFbm(u + 0.37, v + 0.11, seed + 50021);
        const b = warpFbm(u + 0.73, v + 0.59, seed + 90917);
        u += a * warp * 0.2;
        v += b * warp * 0.2;
      }
      const n = fbm(u, v, seed);
      out[y * w + x] = n;
      if (n < min) min = n;
      if (n > max) max = n;
    }
    if (report && (y & 31) === 0) postMessage({ id, progress: y / h });
  }

  if (p.normalize && max > min) {
    const k = 1 / (max - min);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) * k;
  } else {
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(1, out[i] * 0.5 + 0.5));
  }
  return out;
}

onmessage = (e) => {
  const { id, w, h, p } = e.data;
  const data = generate(id, w, h, p);
  postMessage({ id, data }, [data.buffer]);
};
