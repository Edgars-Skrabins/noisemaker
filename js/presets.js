export const PRESETS = [
  { name: 'Clouds', settings: { type: 'perlin', fractal: 'fbm', octaves: 7, scale: 3, gain: 0.52 } },
  { name: 'Terrain', settings: { type: 'perlin', fractal: 'fbm', octaves: 8, scale: 2, gain: 0.5, warp: 0.4, contrast: 1.1 } },
  { name: 'Mountains', settings: { type: 'perlin', fractal: 'ridged', octaves: 7, scale: 3, gain: 0.5 } },
  { name: 'Marble', settings: { type: 'perlin', fractal: 'fbm', octaves: 6, scale: 2, warp: 1.8 } },
  { name: 'Smoke', settings: { type: 'perlin', fractal: 'billow', octaves: 6, scale: 3, warp: 1.1, contrast: 1.2 } },
  { name: 'Cells', settings: { type: 'worley', cell: 'f1', fractal: 'none', scale: 8 } },
  { name: 'Cracks', settings: { type: 'worley', cell: 'edges', fractal: 'none', scale: 6, invert: true, contrast: 1.8, brightness: 0.12 } },
  { name: 'Stone', settings: { type: 'worley', cell: 'f1', fractal: 'fbm', octaves: 4, scale: 5, gain: 0.45, invert: true } },
  { name: 'Static', settings: { type: 'white' } },
];
