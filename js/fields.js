export function decimalsFor(step) {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function formatNumber(value, step) {
  return Number(value).toFixed(decimalsFor(step));
}

export function commitNumber(text, min, max, step, fallback) {
  const raw = typeof text === 'number' ? text : parseFloat(String(text).trim().replace(',', '.'));
  if (!Number.isFinite(raw)) return fallback;
  const clamped = Math.min(max, Math.max(min, raw));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(decimalsFor(step)))));
}
