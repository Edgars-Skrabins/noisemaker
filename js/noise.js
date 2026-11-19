const INV32 = 1 / 4294967296;
const GX = new Float64Array(16);
const GY = new Float64Array(16);
for (let k = 0; k < 16; k++) {
  GX[k] = Math.cos((k * Math.PI * 2) / 16);
  GY[k] = Math.sin((k * Math.PI * 2) / 16);
}

function mix(h) {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return h ^ (h >>> 16);
}

export function hash(x, y, s) {
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

export function valueNoise(x, y, s, p) {
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

export function perlin(x, y, s, p) {
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

export function worley(x, y, s, p, o) {
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
  if (p.type === 'worley') {
    const o = { metric: p.metric, cell: p.cell, jitter: p.jitter };
    return (x, y, s, per) => worley(x, y, s, per, o);
  }
  return perlin;
}

export function octaveFrequencies(scale, lacunarity, octaves, tile) {
  const freqs = [];
  let freq = scale;
  let prev = 0;
  for (let i = 0; i < octaves; i++) {
    const f = tile ? Math.max(prev + 1, Math.round(freq)) : freq;
    freqs.push(f);
    prev = f;
    freq *= lacunarity;
  }
  return freqs;
}

function makeFractal(p, base, tile) {
  const octaves = p.fractal === 'none' ? 1 : Math.max(1, p.octaves | 0);
  const mode = p.fractal;
  const freqs = octaveFrequencies(p.scale, p.lacunarity, octaves, tile);
  return (u, v, seed) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      const f = freqs[i];
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
    }
    return sum / norm;
  };
}

export function createSampler(p) {
  const seed = p.seed | 0;
  const tile = !!p.tileable;
  const fbm = makeFractal(p, createBase(p), tile);
  const warp = p.warp;
  if (!(warp > 0)) return (u, v) => fbm(u, v, seed);
  const warpFbm = makeFractal({ ...p, fractal: 'fbm', octaves: Math.min(p.octaves, 4) }, perlin, tile);
  return (u, v) => {
    const a = warpFbm(u + 0.37, v + 0.11, seed + 50021);
    const b = warpFbm(u + 0.73, v + 0.59, seed + 90917);
    return fbm(u + a * warp * 0.2, v + b * warp * 0.2, seed);
  };
}

export function generate(w, h, p, onProgress) {
  const out = new Float32Array(w * h);
  const seed = p.seed | 0;

  if (p.type === 'white') {
    const kx = (p.size || w) / w;
    const ky = (p.size || h) / h;
    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * ky);
      for (let x = 0; x < w; x++) out[y * w + x] = hash(Math.floor(x * kx), sy, seed) * INV32;
    }
    return out;
  }

  const sample = createSampler(p);
  const report = onProgress && w * h >= 1 << 20;
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i] = sample(x / w, v);
      const n = out[i];
      if (n < min) min = n;
      if (n > max) max = n;
    }
    if (report && (y & 31) === 0) onProgress(y / h);
  }

  if (p.normalize && max > min) {
    const k = 1 / (max - min);
    for (let i = 0; i < out.length; i++) out[i] = Math.min(1, (out[i] - min) * k);
  } else {
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(1, out[i] * 0.5 + 0.5));
  }
  return out;
}
