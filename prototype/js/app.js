(() => {
  const WORKER_URL = 'js/worker.js';
  const PREVIEW_MAX = 512;

  const DEFAULTS = {
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
  };

  const NOISE_KEYS = new Set([
    'type', 'seed', 'scale', 'tileable', 'cell', 'metric', 'jitter',
    'fractal', 'octaves', 'lacunarity', 'gain', 'warp', 'normalize', 'size',
  ]);

  const PRESETS = [
    { name: 'Clouds', p: { type: 'perlin', fractal: 'fbm', octaves: 7, scale: 3, gain: 0.52 } },
    { name: 'Terrain', p: { type: 'perlin', fractal: 'fbm', octaves: 8, scale: 2, gain: 0.5, warp: 0.4, contrast: 1.1 } },
    { name: 'Mountains', p: { type: 'perlin', fractal: 'ridged', octaves: 7, scale: 3, gain: 0.5 } },
    { name: 'Marble', p: { type: 'perlin', fractal: 'fbm', octaves: 6, scale: 2, warp: 1.8 } },
    { name: 'Smoke', p: { type: 'perlin', fractal: 'billow', octaves: 6, scale: 3, warp: 1.1, contrast: 1.2 } },
    { name: 'Cells', p: { type: 'worley', cell: 'f1', fractal: 'none', scale: 8 } },
    { name: 'Cracks', p: { type: 'worley', cell: 'edges', fractal: 'none', scale: 6, invert: true, contrast: 1.8, brightness: 0.12 } },
    { name: 'Stone', p: { type: 'worley', cell: 'f1', fractal: 'fbm', octaves: 4, scale: 5, gain: 0.45, invert: true } },
    { name: 'Static', p: { type: 'white' } },
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let state = { ...DEFAULTS, ...loadState() };
  let previewWorker = null;
  let previewBusy = false;
  let reqId = 0;
  let last = null;
  let regenTimer = 0;
  let activePreset = null;

  const view = $('#view');
  const vctx = view.getContext('2d');
  const src = document.createElement('canvas');
  const sctx = src.getContext('2d');

  function loadState() {
    try {
      const raw = localStorage.getItem('noisemaker:state:v2');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState() {
    try {
      localStorage.setItem('noisemaker:state:v2', JSON.stringify(state));
    } catch {}
  }

  function readInput(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.type === 'number') return parseFloat(el.value);
    if (el.dataset.key === 'size') return parseInt(el.value, 10);
    return el.value;
  }

  function formatValue(key, v) {
    if (key === 'steps') return v <= 1 ? 'off' : String(v);
    if (key === 'octaves') return String(v);
    if (key === 'quality') return Math.round(v * 100) + '%';
    if (key === 'brightness') return (v > 0 ? '+' : '') + v.toFixed(2);
    if (key === 'scale') return v.toFixed(1);
    return Number(v).toFixed(2);
  }

  function syncRange(el) {
    const min = parseFloat(el.min);
    const max = parseFloat(el.max);
    el.style.setProperty('--pct', ((parseFloat(el.value) - min) / (max - min)) * 100 + '%');
    const out = $(`output[data-for="${el.dataset.key}"]`);
    if (out) out.textContent = formatValue(el.dataset.key, parseFloat(el.value));
  }

  function writeControls() {
    $$('[data-key]').forEach((el) => {
      const v = state[el.dataset.key];
      if (el.type === 'radio') el.checked = el.value === String(v);
      else if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
      if (el.type === 'range') syncRange(el);
    });
    updateVisibility();
  }

  function matches(expr) {
    return expr.split('&').every((clause) => {
      const neg = clause.includes('!=');
      const [k, v] = clause.split(neg ? '!=' : '=');
      const ok = v.split('|').includes(String(state[k]));
      return neg ? !ok : ok;
    });
  }

  function updateVisibility() {
    $$('[data-show]').forEach((el) => {
      el.hidden = !matches(el.dataset.show);
    });
  }

  function postProcess(data, w, h, s) {
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
    }

    for (let i = 0; i < n; i++) {
      const g = (height[i] * 255 + 0.5) | 0;
      const o = i * 4;
      rgba[o] = g;
      rgba[o + 1] = g;
      rgba[o + 2] = g;
      rgba[o + 3] = 255;
    }
    return { rgba, height };
  }

  function noiseParams(s) {
    const p = {};
    NOISE_KEYS.forEach((k) => { p[k] = s[k]; });
    return p;
  }

  function runWorker(worker, id, w, h, p, onProgress) {
    return new Promise((resolve) => {
      worker.onmessage = (e) => {
        if (e.data.id !== id) return;
        if (e.data.progress !== undefined) {
          if (onProgress) onProgress(e.data.progress);
          return;
        }
        resolve(e.data.data);
      };
      worker.postMessage({ id, w, h, p });
    });
  }

  function scheduleRegen() {
    clearTimeout(regenTimer);
    regenTimer = setTimeout(regen, 25);
  }

  async function regen() {
    const res = Math.min(state.size, PREVIEW_MAX);
    if (previewBusy && previewWorker) {
      previewWorker.terminate();
      previewWorker = null;
    }
    if (!previewWorker) previewWorker = new Worker(WORKER_URL);
    const id = ++reqId;
    previewBusy = true;
    $('#busy').classList.add('on');
    const t0 = performance.now();
    const data = await runWorker(previewWorker, id, res, res, noiseParams(state));
    if (id !== reqId) return;
    previewBusy = false;
    $('#busy').classList.remove('on');
    last = { data, res, ms: performance.now() - t0 };
    draw();
  }

  function draw() {
    if (!last) return;
    const { data, res } = last;
    const { rgba } = postProcess(data, res, res, state);
    src.width = res;
    src.height = res;
    sctx.putImageData(new ImageData(rgba, res, res), 0, 0);
    if (state.tilePreview) {
      view.width = res * 2;
      view.height = res * 2;
      for (let i = 0; i < 4; i++) vctx.drawImage(src, (i & 1) * res, (i >> 1) * res);
    } else {
      view.width = res;
      view.height = res;
      vctx.drawImage(src, 0, 0);
    }
    updateChips();
  }

  function updateChips() {
    const chips = [];
    chips.push(`<span class="chip">preview ${last.res}²</span>`);
    chips.push(`<span class="chip">export ${state.size}²</span>`);
    chips.push(`<span class="chip">${Math.round(last.ms)} ms</span>`);
    if (state.tileable && state.type !== 'simplex' && state.type !== 'white') chips.push('<span class="chip good">seamless</span>');
    $('#chips').innerHTML = chips.join('');
  }

  function onChange(key) {
    if (!['tilePreview', 'size', 'format', 'quality'].includes(key)) {
      activePreset = null;
      $$('.preset').forEach((b) => b.classList.remove('active'));
    }
    updateVisibility();
    saveState();
    if (NOISE_KEYS.has(key)) scheduleRegen();
    else if (key !== 'format' && key !== 'quality') draw();
  }

  function setState(patch) {
    state = { ...state, ...patch };
    writeControls();
    saveState();
    scheduleRegen();
  }

  function applyPreset(i) {
    const keep = { size: state.size, format: state.format, quality: state.quality, tilePreview: state.tilePreview, seed: state.seed };
    setState({ ...DEFAULTS, ...keep, ...PRESETS[i].p });
    activePreset = i;
    $$('.preset').forEach((b, j) => b.classList.toggle('active', j === i));
  }

  function newSeed() {
    return Math.floor(Math.random() * 999999);
  }

  function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
  }

  function surprise() {
    const r = (a, b, step) => Math.round((a + Math.random() * (b - a)) / step) * step;
    const type = pick(['perlin', 'perlin', 'value', 'simplex', 'worley', 'worley']);
    setState({
      type,
      seed: newSeed(),
      fractal: pick(['fbm', 'fbm', 'ridged', 'billow', type === 'worley' ? 'none' : 'fbm']),
      cell: pick(['f1', 'f2', 'edges', 'cells']),
      metric: pick(['euclidean', 'euclidean', 'manhattan', 'chebyshev']),
      scale: r(2, 9, 0.5),
      octaves: r(3, 8, 1),
      gain: r(0.35, 0.62, 0.01),
      lacunarity: r(1.8, 2.6, 0.05),
      warp: Math.random() < 0.5 ? r(0.3, 2.2, 0.05) : 0,
      contrast: r(0.9, 1.4, 0.05),
      brightness: 0,
      steps: 1,
      invert: Math.random() < 0.2,
    });
  }

  async function buildPresets() {
    const wrap = $('#presets');
    const thumbs = PRESETS.map((pr, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset';
      b.innerHTML = `<canvas width="72" height="72"></canvas><span>${pr.name}</span>`;
      b.addEventListener('click', () => applyPreset(i));
      wrap.append(b);
      return b.querySelector('canvas');
    });
    const worker = new Worker(WORKER_URL);
    for (let i = 0; i < PRESETS.length; i++) {
      const s = { ...DEFAULTS, ...PRESETS[i].p };
      const size = 72;
      const data = await runWorker(worker, i, size, size, noiseParams(s));
      const { rgba } = postProcess(data, size, size, s);
      thumbs[i].getContext('2d').putImageData(new ImageData(rgba, size, size), 0, 0);
    }
    worker.terminate();
  }

  function encodeBMP(rgba, w, h) {
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
    return new Blob([buf], { type: 'image/bmp' });
  }

  function encodeTGA(rgba, w, h) {
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
    return new Blob([buf], { type: 'image/x-tga' });
  }

  function encodeR16(height) {
    const buf = new ArrayBuffer(height.length * 2);
    const dv = new DataView(buf);
    for (let i = 0; i < height.length; i++) dv.setUint16(i * 2, Math.round(height[i] * 65535), true);
    return new Blob([buf], { type: 'application/octet-stream' });
  }

  function canvasBlob(rgba, w, h, type, quality) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    return new Promise((resolve) => c.toBlob(resolve, type, quality));
  }

  async function render(size, onProgress) {
    const worker = new Worker(WORKER_URL);
    const data = await runWorker(worker, 1, size, size, noiseParams({ ...state, size }), onProgress);
    worker.terminate();
    return postProcess(data, size, size, state);
  }

  async function encode(fmt, out, size) {
    if (fmt === 'bmp') return encodeBMP(out.rgba, size, size);
    if (fmt === 'tga') return encodeTGA(out.rgba, size, size);
    if (fmt === 'r16') return encodeR16(out.height);
    const mime = fmt === 'webp' ? 'image/webp' : fmt === 'png' ? 'image/png' : 'image/jpeg';
    return canvasBlob(out.rgba, size, size, mime, state.quality);
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function fileName(ext) {
    const label = activePreset !== null ? PRESETS[activePreset].name.toLowerCase() : state.type;
    return `noisemaker_${label}_${state.seed}_${state.size}.${ext}`;
  }

  async function withProgress(task) {
    const bar = $('#progress');
    const fill = bar.firstElementChild;
    const buttons = [$('#download'), $('#copy')];
    buttons.forEach((b) => { b.disabled = true; });
    bar.hidden = false;
    fill.style.width = '2%';
    try {
      return await task((p) => { fill.style.width = Math.max(2, p * 100) + '%'; });
    } finally {
      fill.style.width = '100%';
      setTimeout(() => { bar.hidden = true; fill.style.width = '0'; }, 300);
      buttons.forEach((b) => { b.disabled = false; });
    }
  }

  async function doExport() {
    const size = state.size;
    const fmt = state.format;
    try {
      await withProgress(async (progress) => {
        const out = await render(size, progress);
        const blob = await encode(fmt, out, size);
        if (fmt === 'webp' && blob.type !== 'image/webp') {
          toast('This browser can\'t encode WebP, saved as PNG instead');
          download(blob, fileName('png'));
          return;
        }
        download(blob, fileName(fmt));
        toast(`Exported ${size}×${size} ${fmt.toUpperCase()} · ${formatBytes(blob.size)}`);
      });
    } catch (err) {
      toast('Export failed: ' + err.message);
    }
  }

  async function doCopy() {
    if (!navigator.clipboard || !window.ClipboardItem) {
      toast('Clipboard images aren\'t supported in this browser');
      return;
    }
    try {
      await withProgress(async (progress) => {
        const size = state.size;
        const out = await render(size, progress);
        const blob = await canvasBlob(out.rgba, size, size, 'image/png');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast(`Copied ${size}×${size} PNG to clipboard`);
      });
    } catch (err) {
      toast('Copy failed: ' + err.message);
    }
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function bind() {
    $$('[data-key]').forEach((el) => {
      const ev = el.type === 'range' || el.type === 'number' ? 'input' : 'change';
      el.addEventListener(ev, () => {
        const key = el.dataset.key;
        const v = readInput(el);
        if (el.type === 'number' && Number.isNaN(v)) return;
        state[key] = el.type === 'number' ? Math.round(v) : v;
        if (el.type === 'range') syncRange(el);
        onChange(key);
      });
    });

    $('#reseed').addEventListener('click', () => setState({ seed: newSeed() }));
    $('#surprise').addEventListener('click', surprise);
    $('#reset').addEventListener('click', () => {
      activePreset = null;
      $$('.preset').forEach((b) => b.classList.remove('active'));
      setState({ ...DEFAULTS });
    });
    $('#download').addEventListener('click', doExport);
    $('#copy').addEventListener('click', doCopy);

    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox' && e.target.type !== 'radio') return;
      if (tag === 'select' || tag === 'textarea') return;
      if (e.key === 'r' || e.key === 'R') setState({ seed: newSeed() });
      else if (e.key === 't' || e.key === 'T') { state.tilePreview = !state.tilePreview; writeControls(); onChange('tilePreview'); }
    });
  }

  writeControls();
  bind();
  regen();
  buildPresets();
})();
