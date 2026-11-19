export const ZOOM_STEPS = Object.freeze([0.0625, 0.125, 0.25, 1 / 3, 0.5, 2 / 3, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]);

const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
const EPS = 1e-6;

export function fitZoom(viewW, viewH, imageW, imageH, pad = 0) {
  if (!(imageW > 0) || !(imageH > 0)) return 1;
  const z = Math.min((viewW - pad * 2) / imageW, (viewH - pad * 2) / imageH);
  if (!Number.isFinite(z)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function zoomIn(z) {
  return ZOOM_STEPS.find((s) => s > z + EPS) ?? MAX_ZOOM;
}

export function zoomOut(z) {
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) if (ZOOM_STEPS[i] < z - EPS) return ZOOM_STEPS[i];
  return MIN_ZOOM;
}

export function formatZoom(z) {
  const pct = z * 100;
  const rounded = pct < 10 ? Math.round(pct * 100) / 100 : pct < 100 ? Math.round(pct * 10) / 10 : Math.round(pct);
  return rounded + '%';
}

export function pointerToPixel(px, py, displayW, displayH, srcW, srcH, tiles = 1) {
  if (!(displayW > 0) || !(displayH > 0)) return null;
  if (px < 0 || py < 0 || px >= displayW || py >= displayH) return null;
  const x = Math.floor((px / displayW) * srcW * tiles) % srcW;
  const y = Math.floor((py / displayH) * srcH * tiles) % srcH;
  return { x, y };
}
