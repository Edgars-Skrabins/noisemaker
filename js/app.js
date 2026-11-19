import { DEFAULTS, NOISE_KEYS, VIEW_KEYS, noiseParams, newSeed, randomize } from './settings.js';
import { PRESETS } from './presets.js';
import { loadSettings, saveSettings } from './storage.js';
import { postProcess } from './postprocess.js';
import { NoiseWorker, CancelledError } from './worker-client.js';
import { canvasBlob, encode, download, formatBytes } from './exporter.js';

const PREVIEW_MAX = 512;
const THUMB_SIZE = 72;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const storage = browserStorage();
let state = loadSettings(storage);
let previewWorker = null;
let previewBusy = false;
let reqId = 0;
let last = null;
let regenTimer = 0;
let activePreset = null;
let toastTimer = 0;
let progressTimer = 0;

const view = $('#view');
const vctx = view.getContext('2d');
const src = document.createElement('canvas');
const sctx = src.getContext('2d');

function persist() {
  saveSettings(storage, state);
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

function markPreset(i) {
  activePreset = i;
  $$('.preset').forEach((b, j) => b.classList.toggle('active', j === i));
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
  if (!previewWorker) previewWorker = new NoiseWorker();
  const id = ++reqId;
  previewBusy = true;
  $('#busy').classList.add('on');
  let data;
  try {
    data = await previewWorker.run(res, res, noiseParams(state));
  } catch (err) {
    if (err instanceof CancelledError || id !== reqId) return;
    previewBusy = false;
    $('#busy').classList.remove('on');
    toast('Preview failed: ' + err.message);
    return;
  }
  if (id !== reqId) return;
  previewBusy = false;
  $('#busy').classList.remove('on');
  last = { data, res };
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
}

function onChange(key) {
  if (!VIEW_KEYS.has(key)) markPreset(null);
  updateVisibility();
  persist();
  if (NOISE_KEYS.has(key)) scheduleRegen();
  else if (key !== 'format' && key !== 'quality') draw();
}

function setState(patch) {
  state = { ...state, ...patch };
  writeControls();
  persist();
  scheduleRegen();
}

function applyPreset(i) {
  const keep = { size: state.size, format: state.format, quality: state.quality, tilePreview: state.tilePreview, seed: state.seed };
  setState({ ...DEFAULTS, ...keep, ...PRESETS[i].settings });
  markPreset(i);
}

async function buildPresets() {
  const container = $('#presets');
  const thumbs = PRESETS.map((preset, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
    const label = document.createElement('span');
    label.textContent = preset.name;
    b.append(canvas, label);
    b.addEventListener('click', () => applyPreset(i));
    container.append(b);
    return canvas;
  });
  const worker = new NoiseWorker();
  try {
    for (let i = 0; i < PRESETS.length; i++) {
      const s = { ...DEFAULTS, ...PRESETS[i].settings };
      const data = await worker.run(THUMB_SIZE, THUMB_SIZE, noiseParams(s));
      const { rgba } = postProcess(data, THUMB_SIZE, THUMB_SIZE, s);
      thumbs[i].getContext('2d').putImageData(new ImageData(rgba, THUMB_SIZE, THUMB_SIZE), 0, 0);
    }
  } finally {
    worker.terminate();
  }
}

async function render(settings, onProgress) {
  const size = settings.size;
  const worker = new NoiseWorker();
  try {
    const data = await worker.run(size, size, noiseParams(settings), onProgress);
    return postProcess(data, size, size, settings);
  } finally {
    worker.terminate();
  }
}

function fileName(settings, presetIndex, ext) {
  const label = presetIndex !== null ? PRESETS[presetIndex].name.toLowerCase() : settings.type;
  return `noisemaker_${label}_${settings.seed}_${settings.size}.${ext}`;
}

async function withProgress(task) {
  const bar = $('#progress');
  const fill = bar.firstElementChild;
  const buttons = [$('#download'), $('#copy')];
  clearTimeout(progressTimer);
  buttons.forEach((b) => { b.disabled = true; });
  bar.hidden = false;
  fill.style.width = '2%';
  try {
    return await task((p) => { fill.style.width = Math.max(2, p * 100) + '%'; });
  } finally {
    fill.style.width = '100%';
    progressTimer = setTimeout(() => { bar.hidden = true; fill.style.width = '0'; }, 300);
    buttons.forEach((b) => { b.disabled = false; });
  }
}

async function doExport() {
  const settings = { ...state };
  const presetIndex = activePreset;
  const { size, format } = settings;
  try {
    await withProgress(async (progress) => {
      const out = await render(settings, progress);
      const blob = await encode(format, out, size, settings.quality);
      if (format === 'webp' && blob.type !== 'image/webp') {
        download(blob, fileName(settings, presetIndex, 'png'));
        toast('This browser can\'t encode WebP, saved as PNG instead');
        return;
      }
      download(blob, fileName(settings, presetIndex, format));
      toast(`Exported ${size}×${size} ${format.toUpperCase()} · ${formatBytes(blob.size)}`);
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
  const settings = { ...state };
  const size = settings.size;
  const blob = withProgress(async (progress) => {
    const out = await render(settings, progress);
    return canvasBlob(out.rgba, size, size, 'image/png');
  });
  blob.catch(() => {});
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast(`Copied ${size}×${size} PNG to clipboard`);
  } catch (err) {
    toast('Copy failed: ' + err.message);
  }
}

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
  $('#randomize').addEventListener('click', () => {
    markPreset(null);
    setState(randomize());
  });
  $('#reset').addEventListener('click', () => {
    markPreset(null);
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
    else if (e.key === 't' || e.key === 'T') {
      state.tilePreview = !state.tilePreview;
      writeControls();
      onChange('tilePreview');
    }
  });
}

writeControls();
bind();
regen();
buildPresets().catch((err) => toast('Preset thumbnails failed: ' + err.message));
