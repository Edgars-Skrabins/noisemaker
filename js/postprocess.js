export function postProcess(data, w, h, s) {
  const n = w * h;
  const height = new Float32Array(n);
  const rgba = new Uint8ClampedArray(n * 4);
  const steps = s.steps | 0;
  for (let i = 0; i < n; i++) {
    let v = (data[i] - 0.5) * s.contrast + 0.5 + s.brightness;
    if (s.invert) v = 1 - v;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    if (steps >= 2) v = Math.min(steps - 1, Math.floor(v * steps)) / (steps - 1);
    height[i] = v;
    const g = (v * 255 + 0.5) | 0;
    const o = i * 4;
    rgba[o] = g;
    rgba[o + 1] = g;
    rgba[o + 2] = g;
    rgba[o + 3] = 255;
  }
  return { rgba, height };
}
