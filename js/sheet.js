import { newSeed } from './settings.js';

export const SHEET_FRAMES = 4;

function freshSeeds(count, taken, random) {
  const out = [];
  const used = new Set(taken);
  while (out.length < count) {
    const s = newSeed(random);
    if (used.has(s)) continue;
    used.add(s);
    out.push(s);
  }
  return out;
}

export function makeSheet(seed, random = Math.random) {
  return [seed, ...freshSeeds(SHEET_FRAMES - 1, [seed], random)];
}

export function syncSheet(seeds, seed) {
  if (seeds.includes(seed)) return seeds;
  return [seed, ...seeds.slice(1)];
}

export function shuffleSheet(seeds, seed, random = Math.random) {
  const keep = Math.max(0, seeds.indexOf(seed));
  const fresh = freshSeeds(SHEET_FRAMES - 1, [seed, ...seeds], random);
  return Array.from({ length: SHEET_FRAMES }, (_, i) => (i === keep ? seed : fresh.shift()));
}
