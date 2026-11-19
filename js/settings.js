export const DEFAULTS = Object.freeze({
  type: 'perlin',
  seed: 1337,
  scale: 4,
  tileable: true,
  cell: 'f1',
  metric: 'euclidean',
  jitter: 1,
  fractal: 'fbm',
  octaves: 5,
  lacunarity: 2,
  gain: 0.5,
  warp: 0,
  contrast: 1,
  brightness: 0,
  steps: 1,
  invert: false,
  normalize: true,
  tilePreview: false,
  size: 1024,
  format: 'png',
  quality: 0.92,
});

export const OPTIONS = Object.freeze({
  type: ['perlin', 'value', 'worley', 'white'],
  cell: ['f1', 'f2', 'edges', 'cells'],
  metric: ['euclidean', 'manhattan', 'chebyshev'],
  fractal: ['none', 'fbm', 'ridged', 'billow'],
  size: [128, 256, 512, 1024, 2048, 4096],
  format: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tga', 'r16'],
});

export const RANGES = Object.freeze({
  scale: [1, 32],
  jitter: [0, 1],
  octaves: [1, 10],
  lacunarity: [1.2, 4],
  gain: [0.1, 0.9],
  warp: [0, 3],
  contrast: [0, 3],
  brightness: [-0.5, 0.5],
  steps: [1, 16],
  quality: [0.5, 1],
});

const INTEGER_KEYS = new Set(['seed', 'octaves', 'steps']);

export const NOISE_KEYS = new Set([
  'type', 'seed', 'scale', 'tileable', 'cell', 'metric', 'jitter',
  'fractal', 'octaves', 'lacunarity', 'gain', 'warp', 'normalize', 'size',
]);

function sanitizeValue(key, value) {
  const fallback = DEFAULTS[key];
  if (OPTIONS[key]) return OPTIONS[key].includes(value) ? value : fallback;
  if (typeof fallback === 'boolean') return typeof value === 'boolean' ? value : fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  let v = INTEGER_KEYS.has(key) ? Math.round(value) : value;
  const range = RANGES[key];
  if (range) v = Math.min(range[1], Math.max(range[0], v));
  return v;
}

export function sanitize(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = key in src ? sanitizeValue(key, src[key]) : DEFAULTS[key];
  }
  return out;
}

export function noiseParams(settings) {
  const p = {};
  NOISE_KEYS.forEach((k) => { p[k] = settings[k]; });
  return p;
}

export function newSeed(random = Math.random) {
  return Math.floor(random() * 999999);
}

export function randomize(random = Math.random) {
  const pick = (a) => a[Math.floor(random() * a.length)];
  const r = (a, b, step) => Math.round((a + random() * (b - a)) / step) * step;
  const type = pick(['perlin', 'perlin', 'value', 'worley', 'worley']);
  return {
    type,
    seed: newSeed(random),
    fractal: pick(['fbm', 'fbm', 'ridged', 'billow', type === 'worley' ? 'none' : 'fbm']),
    cell: pick(OPTIONS.cell),
    metric: pick(['euclidean', 'euclidean', 'manhattan', 'chebyshev']),
    scale: r(2, 9, 0.5),
    octaves: r(3, 8, 1),
    gain: r(0.35, 0.62, 0.01),
    lacunarity: r(1.8, 2.6, 0.05),
    warp: random() < 0.5 ? r(0.3, 2.2, 0.05) : 0,
    contrast: r(0.9, 1.4, 0.05),
    brightness: 0,
    steps: 1,
    invert: random() < 0.2,
  };
}
