import { formatNumber } from './fields.js';

const TYPES = { perlin: 'Perlin', value: 'Value', worley: 'Worley', white: 'White' };
const CELLS = { f1: 'F1', f2: 'F2', edges: 'F2 − F1', cells: 'Cell ID' };
const FRACTALS = { fbm: 'fBm', ridged: 'Ridged', billow: 'Billow' };
const FORMATS = { png: 'PNG', jpg: 'JPG', jpeg: 'JPEG', webp: 'WebP', bmp: 'BMP', tga: 'TGA', r16: 'RAW16' };
const LOSSY = new Set(['jpg', 'jpeg', 'webp']);

function trim(v, step) {
  const s = formatNumber(v, step);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

function pattern(s) {
  const parts = [TYPES[s.type]];
  if (s.type === 'white') return parts;
  if (s.type === 'worley') parts.push(CELLS[s.cell]);
  parts.push(`scale ${trim(s.scale, 0.5)}`);
  if (!s.tileable) parts.push('no tiling');
  return parts;
}

function detail(s) {
  const parts = s.fractal === 'none' ? ['No fractal'] : [FRACTALS[s.fractal], `${s.octaves} ${s.octaves === 1 ? 'octave' : 'octaves'}`];
  if (s.warp > 0) parts.push(`warp ${trim(s.warp, 0.05)}`);
  return parts;
}

function tone(s) {
  const parts = [];
  if (s.normalize) parts.push('Auto-levels');
  if (s.contrast !== 1) parts.push(`contrast ${trim(s.contrast, 0.05)}`);
  if (s.brightness !== 0) parts.push(`brightness ${s.brightness > 0 ? '+' : '−'}${trim(Math.abs(s.brightness), 0.01)}`);
  if (s.steps > 1) parts.push(`${s.steps} levels`);
  if (s.invert) parts.push('Inverted');
  return parts.length ? parts : ['Unchanged'];
}

function exportStep(s) {
  const format = FORMATS[s.format] + (LOSSY.has(s.format) ? ` ${Math.round(s.quality * 100)}%` : '');
  return [`${s.size} px`, format];
}

const STEPS = { pattern, detail, tone, export: exportStep };

export function stepSummary(step, settings) {
  return STEPS[step](settings).join(' · ');
}
