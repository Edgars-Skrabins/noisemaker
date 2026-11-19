import { DEFAULTS, NOISE_KEYS, noiseParams, newSeed, randomize } from './settings.js';
import { PRESETS } from './presets.js';
import { loadSettings, saveSettings } from './storage.js';
import { postProcess } from './postprocess.js';
import { NoiseWorker, CancelledError } from './worker-client.js';
import { canvasBlob, encode, download, formatBytes } from './exporter.js';
import { HELP } from './help.js';
import { setupHelp, hideTip } from './tooltip.js';
import { matches } from './visibility.js';
import { fitZoom, zoomIn, zoomOut, formatZoom, pointerToPixel, previewResolution } from './view.js';
import { commitNumber, formatNumber } from './fields.js';
import {
  UNTITLED, NAME_MAX, mapSettings, isDirty, cleanName, copyName, fileSlug,
  listMaps, getMap, createMap, overwriteMap, deleteMap, loadCurrent, saveCurrent, startMap,
} from './maps.js';
import { openDialog, confirmDialog } from './dialogs.js';
import { THUMB_SIZE, renderSavedList, renderTemplateList } from './library.js';
import { stepSummary } from './summary.js';
import { makeSheet, syncSheet, shuffleSheet } from './sheet.js';

const EDITOR_HASH = '#editor';
const BLANK = { name: 'Blank', settings: {} };
const STARTS = [BLANK, ...PRESETS];

const THUMB_QUALITY = 0.85;
const SHEET_SIZE = 160;
const SAVE_ERRORS = {
  name: 'Enter a name',
  full: 'Browser storage is full. Delete some saved maps and try again.',
  unavailable: 'Saving isn\'t available: this browser is blocking local storage.',
  missing: 'This map no longer exists. Save it as a new map.',
  thumb: 'Couldn\'t render the thumbnail',
};
const FORMAT_LABELS = { png: 'PNG', jpg: 'JPG', jpeg: 'JPEG', webp: 'WebP', bmp: 'BMP', tga: 'TGA', r16: 'RAW16' };

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
let pendingRes = 0;
let reqId = 0;
let last = null;
let lastOut = null;
let regenTimer = 0;
let current = loadCurrent(storage);
let saving = false;
let saveJob = null;
let storageWarned = false;
let templatesBuilt = false;
let newBuilt = false;
let thumbJobs = null;
let screen = document.documentElement.dataset.screen === 'editor' ? 'editor' : 'start';
let toastTimer = 0;
let progressTimer = 0;
let zoom = 1;
let fitMode = true;
let pointer = null;
let sheetSeeds = makeSheet(state.seed);
let sheetCache = { key: '', data: new Map() };
let sheetWorker = null;
let sheetId = 0;
let sheetTimer = 0;

const view = $('#view');
const vctx = view.getContext('2d');
const viewport = $('#viewport');
const print = $('#print');
const src = document.createElement('canvas');
const sctx = src.getContext('2d');

function warnStorage(ok) {
  if (ok || storageWarned || !storage) return;
  storageWarned = true;
  toast('Couldn\'t save to browser storage. Changes won\'t survive a reload.');
}

function persist() {
  warnStorage(saveSettings(storage, state));
  updateDoc();
}

function setCurrent(next) {
  current = next;
  warnStorage(saveCurrent(storage, current));
  updateDoc();
}

function syncCurrent() {
  if (!current.mapId) return;
  const map = getMap(storage, current.mapId);
  if (map) attachMap(map);
  else detachCurrent();
}

function attachMap(map) {
  setCurrent({ mapId: map.id, name: map.name, base: map.settings });
}

function detachCurrent() {
  setCurrent({ ...current, mapId: null, base: null });
}

function updateDoc() {
  const dirty = isDirty(state, current.base);
  $('#doc-name').textContent = current.name;
  $('#doc-name').title = current.name;
  $('#doc-dirty').hidden = !dirty;
  $('#doc-note').hidden = !!current.mapId;
  if (screen === 'editor') document.title = `${dirty ? '• ' : ''}${current.name} — Noisemaker`;
}

function readInput(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range' || el.type === 'number') return parseFloat(el.value);
  if (el.dataset.key === 'size') return parseInt(el.value, 10);
  return el.value;
}

function numField(key) {
  return $(`.num[data-num="${key}"]`);
}

function syncRange(el) {
  const min = parseFloat(el.min);
  const max = parseFloat(el.max);
  el.style.setProperty('--pct', ((parseFloat(el.value) - min) / (max - min)) * 100 + '%');
  const num = numField(el.dataset.key);
  if (num) num.value = formatNumber(state[el.dataset.key], el.step);
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
  updateStatusDoc();
  updateSummaries();
  syncSheetSeeds();
}

function updateSummaries() {
  $$('[data-sum]').forEach((el) => {
    el.textContent = stepSummary(el.dataset.sum, state);
  });
}

function updateVisibility() {
  $$('[data-show]').forEach((el) => {
    el.hidden = !matches(el.dataset.show, state);
  });
  const hiddenOpen = $$('.step').find((step) => step.hidden && step.open);
  if (hiddenOpen) {
    hiddenOpen.open = false;
    $('.step').open = true;
  }
}

function setBusy(on) {
  $('#busy').classList.toggle('on', on);
  $('#status-state').textContent = on ? 'Rendering…' : 'Ready';
}

function updateStatusDoc() {
  $('#status-doc').textContent = `${state.size} × ${state.size} · ${FORMAT_LABELS[state.format]}`;
}

function scheduleRegen() {
  cancelSheet();
  clearTimeout(regenTimer);
  regenTimer = setTimeout(regen, 25);
}

function wantedRes() {
  return previewResolution(state.size, zoom, fitMode, tiles());
}

function stopPreview() {
  if (!previewWorker) return;
  previewWorker.terminate();
  previewWorker = null;
}

async function regen() {
  cancelSheet();
  const res = wantedRes();
  pendingRes = res;
  if (previewBusy) stopPreview();
  if (!previewWorker) previewWorker = new NoiseWorker();
  const id = ++reqId;
  previewBusy = true;
  setBusy(true);
  let data;
  try {
    data = await previewWorker.run(res, res, noiseParams(state));
  } catch (err) {
    if (err instanceof CancelledError || id !== reqId) return;
    previewBusy = false;
    setBusy(false);
    toast('Preview failed: ' + err.message);
    return;
  }
  if (id !== reqId) return;
  previewBusy = false;
  setBusy(false);
  last = { data, res };
  draw();
  scheduleSheet();
}

function tiles() {
  return state.tilePreview ? 2 : 1;
}

function draw() {
  if (!last) return;
  const { data, res } = last;
  lastOut = { ...postProcess(data, res, res, state), res };
  src.width = res;
  src.height = res;
  sctx.putImageData(new ImageData(lastOut.rgba, res, res), 0, 0);
  const n = tiles();
  view.width = res * n;
  view.height = res * n;
  for (let i = 0; i < n * n; i++) vctx.drawImage(src, (i % n) * res, Math.floor(i / n) * res);
  layout();
  updateCursor();
  drawSheet();
}

function boxPad(el) {
  const cs = getComputedStyle(el);
  return [
    parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
    parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
  ];
}

function fitArea() {
  const [vx, vy] = boxPad(viewport);
  const [mx, my] = boxPad(print);
  return [viewport.clientWidth - vx - mx, viewport.clientHeight - vy - my];
}

function layout() {
  if (screen !== 'editor') return;
  const doc = state.size * tiles();
  if (fitMode) {
    const [w, h] = fitArea();
    zoom = fitZoom(w, h, doc, doc);
  }
  const px = Math.max(1, Math.round(doc * zoom));
  view.style.width = px + 'px';
  view.style.height = px + 'px';
  view.classList.toggle('pixelated', !!last && last.res === state.size && zoom > 1);
  $('#zoom-level').textContent = formatZoom(zoom);
  $('#zoom-fit').setAttribute('aria-pressed', String(fitMode));
  const have = previewBusy ? pendingRes : last && last.res;
  if ((previewBusy || last) && wantedRes() !== have) scheduleRegen();
}

function setZoom(z) {
  const cx = (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
  const cy = (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight;
  fitMode = false;
  zoom = z;
  layout();
  viewport.scrollLeft = cx * viewport.scrollWidth - viewport.clientWidth / 2;
  viewport.scrollTop = cy * viewport.scrollHeight - viewport.clientHeight / 2;
}

function fit() {
  fitMode = true;
  layout();
}

function updateCursor() {
  const out = $('#status-cursor');
  const rect = view.getBoundingClientRect();
  const size = state.size;
  const p = pointer && lastOut && pointerToPixel(pointer.x - rect.left, pointer.y - rect.top, rect.width, rect.height, size, size, tiles());
  out.classList.toggle('idle', !p);
  if (!p) {
    out.textContent = 'X –   Y –   Value –';
    return;
  }
  const { res, height } = lastOut;
  const v = height[Math.floor((p.y * res) / size) * res + Math.floor((p.x * res) / size)];
  const approx = res < size ? '≈' : '';
  out.textContent = `X ${p.x}   Y ${p.y}   Value ${approx}${v.toFixed(3)} · ${approx}${Math.round(v * 255)}`;
}

function onChange(key) {
  updateVisibility();
  updateStatusDoc();
  updateSummaries();
  if (key === 'seed') syncSheetSeeds();
  persist();
  if (key === 'size' || key === 'tilePreview') layout();
  if (NOISE_KEYS.has(key)) scheduleRegen();
  else if (key !== 'format' && key !== 'quality') draw();
}

function sheetKey() {
  const { seed, size, ...rest } = noiseParams(state);
  return JSON.stringify(state.type === 'white' ? { ...rest, size } : rest);
}

function frameFor(seed) {
  return $(`.frame[data-seed="${seed}"]`);
}

function drawFrame(seed) {
  const data = sheetCache.data.get(seed);
  const frame = frameFor(seed);
  if (!data || !frame) return;
  const { rgba } = postProcess(data, SHEET_SIZE, SHEET_SIZE, state);
  frame.querySelector('canvas').getContext('2d').putImageData(new ImageData(rgba, SHEET_SIZE, SHEET_SIZE), 0, 0);
}

function drawSheet() {
  if (sheetCache.key !== sheetKey()) return;
  sheetSeeds.forEach(drawFrame);
}

function markSheet() {
  $$('.frame').forEach((frame) => {
    frame.setAttribute('aria-pressed', String(Number(frame.dataset.seed) === state.seed));
  });
}

function buildSheet() {
  $('#sheet-list').replaceChildren(...sheetSeeds.map((seed) => {
    const item = document.createElement('li');
    const frame = document.createElement('button');
    frame.type = 'button';
    frame.className = 'frame';
    frame.dataset.seed = String(seed);
    frame.setAttribute('aria-label', `Use seed ${seed}`);
    const canvas = document.createElement('canvas');
    canvas.width = SHEET_SIZE;
    canvas.height = SHEET_SIZE;
    canvas.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'frame-seed';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = `#${seed}`;
    frame.append(canvas, label);
    frame.addEventListener('click', () => {
      if (seed !== state.seed) setState({ seed });
    });
    item.append(frame);
    return item;
  }));
  markSheet();
  drawSheet();
}

function syncSheetSeeds() {
  const next = syncSheet(sheetSeeds, state.seed);
  if (next === sheetSeeds) {
    markSheet();
    return;
  }
  sheetSeeds = next;
  buildSheet();
}

function stopSheet() {
  if (!sheetWorker) return;
  sheetWorker.terminate();
  sheetWorker = null;
}

function cancelSheet() {
  clearTimeout(sheetTimer);
  sheetId++;
  stopSheet();
}

function scheduleSheet() {
  clearTimeout(sheetTimer);
  sheetTimer = setTimeout(renderSheet, 60);
}

async function renderSheet() {
  if (screen !== 'editor' || previewBusy) return;
  const key = sheetKey();
  if (key !== sheetCache.key) sheetCache = { key, data: new Map() };
  const cache = sheetCache;
  const params = noiseParams(state);
  const id = ++sheetId;
  stopSheet();
  drawSheet();
  const todo = sheetSeeds.filter((seed) => !cache.data.has(seed));
  if (!todo.length) return;
  const worker = new NoiseWorker();
  sheetWorker = worker;
  try {
    for (const seed of todo) {
      const data = await worker.run(SHEET_SIZE, SHEET_SIZE, { ...params, seed });
      if (id !== sheetId) return;
      cache.data.set(seed, data);
      if (cache === sheetCache) drawFrame(seed);
    }
  } catch (err) {
    if (!(err instanceof CancelledError) && id === sheetId) toast('Contact sheet failed: ' + err.message);
  } finally {
    if (sheetWorker === worker) stopSheet();
  }
}

function shuffle() {
  sheetSeeds = shuffleSheet(sheetSeeds, state.seed);
  buildSheet();
  scheduleSheet();
}

function setState(patch) {
  state = { ...state, ...patch };
  writeControls();
  persist();
  layout();
  scheduleRegen();
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

function fileLabel(settings) {
  return (current.name !== UNTITLED && fileSlug(current.name)) || settings.type;
}

function fileName(settings, label, ext) {
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
  const label = fileLabel(settings);
  const { size, format } = settings;
  try {
    await withProgress(async (progress) => {
      const out = await render(settings, progress);
      const blob = await encode(format, out, size, settings.quality);
      if (format === 'webp' && blob.type !== 'image/webp') {
        download(blob, fileName(settings, label, 'png'));
        toast('This browser can\'t encode WebP, saved as PNG instead');
        return;
      }
      download(blob, fileName(settings, label, format));
      toast(`Exported ${size}×${size} ${FORMAT_LABELS[format]} · ${formatBytes(blob.size)}`);
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

async function thumbImage(worker, settings) {
  const data = await worker.run(THUMB_SIZE, THUMB_SIZE, noiseParams(settings));
  return new ImageData(postProcess(data, THUMB_SIZE, THUMB_SIZE, settings).rgba, THUMB_SIZE, THUMB_SIZE);
}

async function thumbnail(worker, settings) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
    canvas.getContext('2d').putImageData(await thumbImage(worker, settings), 0, 0);
    return canvas.toDataURL('image/jpeg', THUMB_QUALITY);
  } finally {
    worker.terminate();
  }
}

function cancelSave() {
  if (saveJob) saveJob.terminate();
}

function commitFocusedField() {
  const el = document.activeElement;
  if (el && el.matches && el.matches('.num')) commitField(el);
}

function saveMode() {
  return $('#save-overwrite').checked && !$('#save-choice').hidden ? 'overwrite' : 'new';
}

function setSaveError(code, detail) {
  $('#save-error').textContent = code ? SAVE_ERRORS[code] + (detail ? ': ' + detail : '') : '';
  $('#save-name').setAttribute('aria-invalid', String(code === 'name'));
}

function syncSaveMode() {
  const name = $('#save-name');
  name.disabled = saveMode() === 'overwrite';
  setSaveError(null);
}

function openSave() {
  if (saving) return;
  commitFocusedField();
  hideTip();
  syncCurrent();
  const saved = current.mapId ? getMap(storage, current.mapId) : null;
  const name = $('#save-name');
  $('#save-choice').hidden = !saved;
  if (saved) {
    $('#save-overwrite-text').textContent = `Overwrite “${saved.name}”`;
    $('#save-overwrite').checked = true;
    name.value = copyName(saved.name);
  } else {
    $('#save-new').checked = true;
    name.value = current.name;
  }
  syncSaveMode();
  $('#save-submit').disabled = false;
  openDialog($('#save-dialog'), { opener: $('#save-map'), focus: saved ? $('#save-overwrite') : name });
  if (!saved) name.select();
}

async function submitSave() {
  if (saving) return;
  const mode = saveMode();
  const name = cleanName($('#save-name').value);
  if (mode === 'new' && !name) {
    setSaveError('name');
    $('#save-name').focus();
    return;
  }
  const settings = mapSettings(state);
  saving = true;
  $('#save-submit').disabled = true;
  let worker = null;
  let thumb;
  try {
    worker = new NoiseWorker();
    saveJob = worker;
    thumb = await thumbnail(worker, settings);
  } catch (err) {
    if (!(err instanceof CancelledError)) setSaveError('thumb', err.message);
    return;
  } finally {
    if (saveJob === worker) saveJob = null;
    saving = false;
    $('#save-submit').disabled = false;
  }
  if (!$('#save-dialog').open) return;
  const res = mode === 'overwrite'
    ? overwriteMap(storage, current.mapId, { settings, thumb })
    : createMap(storage, { name, settings, thumb });
  if (!res.ok) {
    if (res.error === 'missing') {
      detachCurrent();
      $('#save-new').checked = true;
      syncSaveMode();
    }
    setSaveError(res.error);
    return;
  }
  $('#save-dialog').close('saved');
  toast(`Saved “${res.map.name}”`);
  attachMap(res.map);
}

async function confirmDiscard(opener) {
  if (!isDirty(state, current.base)) return true;
  return confirmDialog({
    title: 'Unsaved changes',
    message: `Discard unsaved changes to “${current.name}”?`,
    confirm: 'Discard changes',
    opener,
  });
}

function applyMap(settings) {
  setState({ ...mapSettings(settings), tilePreview: state.tilePreview });
}

function startNew(template) {
  const next = startMap(template, state);
  setCurrent(next.current);
  applyMap(next.settings);
}

function loadTemplate(i) {
  startNew(PRESETS[i]);
}

function loadSaved(map) {
  const fresh = getMap(storage, map.id) || map;
  attachMap(fresh);
  applyMap(fresh.settings);
}

async function chooseSaved(map, btn) {
  if (!(await confirmDiscard(btn))) return;
  loadSaved(map);
  $('#load-dialog').close('loaded');
}

async function chooseTemplate(i, btn) {
  if (!(await confirmDiscard(btn))) return;
  loadTemplate(i);
  $('#load-dialog').close('loaded');
}

async function confirmDelete(map, btn) {
  const ok = await confirmDialog({
    title: 'Delete map',
    message: `Delete “${map.name}”? This can't be undone.`,
    confirm: 'Delete',
    opener: btn,
  });
  if (!ok) return false;
  const res = deleteMap(storage, map.id);
  if (!res.ok) {
    toast('Couldn\'t delete: browser storage is unavailable');
    return false;
  }
  return true;
}

async function removeSaved(map, btn) {
  if (!(await confirmDelete(map, btn))) return;
  if (map.id === current.mapId) detachCurrent();
  renderSaved();
  $('#tab-saved').focus();
}

function renderSaved() {
  renderSavedList($('#saved-list'), listMaps(storage), {
    currentId: current.mapId,
    onOpen: chooseSaved,
    onDelete: removeSaved,
  });
}

function selectTab(name, focus = false) {
  [['saved', $('#tab-saved'), $('#panel-saved')], ['templates', $('#tab-templates'), $('#panel-templates')]].forEach(([n, tab, panel]) => {
    const on = n === name;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
    if (on && focus) tab.focus();
  });
}

function templateThumbs() {
  if (thumbJobs) return thumbJobs;
  const worker = new NoiseWorker();
  let chain = Promise.resolve();
  const jobs = STARTS.map((t) => (chain = chain.then(() => thumbImage(worker, { ...DEFAULTS, ...t.settings }))));
  chain.catch(() => { if (thumbJobs === jobs) thumbJobs = null; }).finally(() => worker.terminate());
  jobs.forEach((job) => job.catch(() => {}));
  thumbJobs = jobs;
  return jobs;
}

function drawThumbs(canvases, offset) {
  const jobs = templateThumbs();
  return Promise.all(canvases.map((canvas, i) => jobs[i + offset].then((img) => canvas.getContext('2d').putImageData(img, 0, 0))));
}

function buildTemplates() {
  if (templatesBuilt) return Promise.resolve();
  templatesBuilt = true;
  const canvases = renderTemplateList($('#template-list'), PRESETS, { onOpen: chooseTemplate });
  return drawThumbs(canvases, 1).catch((err) => {
    templatesBuilt = false;
    throw err;
  });
}

function openLoad() {
  hideTip();
  syncCurrent();
  renderSaved();
  buildTemplates().catch((err) => toast('Template thumbnails failed: ' + err.message));
  const hasSaved = listMaps(storage).length > 0;
  selectTab(hasSaved ? 'saved' : 'templates');
  const dialog = $('#load-dialog');
  openDialog(dialog, { opener: $('#load-map'), focus: hasSaved ? $('#tab-saved') : $('#tab-templates') });
}

function setHash(name) {
  const url = location.pathname + location.search + (name === 'editor' ? EDITOR_HASH : '');
  if (location.href.slice(location.origin.length) !== url) history.replaceState(null, '', url);
}

function showScreen(name, { focus = true } = {}) {
  screen = name;
  document.documentElement.dataset.screen = name;
  setHash(name);
  hideTip();
  if (name === 'editor') {
    updateDoc();
    layout();
    if (!last && !previewBusy) scheduleRegen();
    else scheduleSheet();
    if (focus) $('#doc-name').focus();
  } else {
    document.title = 'Noisemaker';
    renderStart();
    if (focus) $('#start-title').focus();
  }
}

function clearEditor() {
  const next = startMap(null, state);
  clearTimeout(regenTimer);
  reqId++;
  stopPreview();
  cancelSheet();
  previewBusy = false;
  setBusy(false);
  state = { ...next.settings, tilePreview: state.tilePreview };
  last = null;
  lastOut = null;
  vctx.clearRect(0, 0, view.width, view.height);
  writeControls();
  warnStorage(saveSettings(storage, state));
  setCurrent(next.current);
}

async function goHome() {
  if (screen !== 'editor') return true;
  commitFocusedField();
  hideTip();
  const dirty = isDirty(state, current.base);
  if (dirty && !(await confirmDiscard($('#home')))) return false;
  if (dirty) clearEditor();
  showScreen('start');
  return true;
}

function renderStart() {
  syncCurrent();
  const maps = listMaps(storage);
  const has = maps.length > 0;
  $('#start-list').hidden = !has;
  $('#start-empty').hidden = has;
  $('#new-map').hidden = !has;
  $('#start-count').textContent = has ? `${maps.length} saved ${maps.length === 1 ? 'map' : 'maps'}` : '';
  if (has) renderSavedList($('#start-list'), maps, { onOpen: openFromStart, onDelete: removeFromStart });
  else $('#start-list').replaceChildren();
}

async function openFromStart(map, btn) {
  if (!(await confirmDiscard(btn))) return;
  loadSaved(map);
  showScreen('editor');
}

async function removeFromStart(map, btn) {
  if (!(await confirmDelete(map, btn))) return;
  if (map.id === current.mapId) {
    if (isDirty(state, current.base)) detachCurrent();
    else clearEditor();
  }
  renderStart();
  ($('#new-map').hidden ? $('#new-map-empty') : $('#new-map')).focus();
}

async function chooseNew(i, btn) {
  if (!(await confirmDiscard(btn))) return;
  startNew(i === 0 ? null : STARTS[i]);
  $('#new-dialog').close('created');
  showScreen('editor');
}

function openNew(opener) {
  if (!newBuilt) {
    newBuilt = true;
    const canvases = renderTemplateList($('#new-list'), STARTS, { onOpen: chooseNew });
    drawThumbs(canvases, 0).catch((err) => {
      newBuilt = false;
      toast('Template thumbnails failed: ' + err.message);
    });
  }
  openDialog($('#new-dialog'), { opener, focus: $('#new-list .map-open') });
}

function dialogOpen() {
  return !!document.querySelector('dialog[open]');
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function rangeFor(num) {
  return $(`input[type="range"][data-key="${num.dataset.num}"]`);
}

function commitField(num, text = num.value) {
  const key = num.dataset.num;
  const range = rangeFor(num);
  const v = commitNumber(text, parseFloat(range.min), parseFloat(range.max), parseFloat(range.step), state[key]);
  const changed = v !== state[key];
  state[key] = v;
  range.value = v;
  syncRange(range);
  if (changed) onChange(key);
}

function bindFields() {
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

  $$('.num').forEach((num) => {
    num.addEventListener('change', () => commitField(num));
    num.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitField(num);
      else if (e.key === 'Escape') {
        num.value = formatNumber(state[num.dataset.num], rangeFor(num).step);
        num.blur();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = parseFloat(rangeFor(num).step) * (e.shiftKey ? 10 : 1);
        commitField(num, state[num.dataset.num] + (e.key === 'ArrowUp' ? step : -step));
        num.select();
      }
    });
    num.addEventListener('focus', () => num.select());
  });
}

function bindDocument() {
  $('#reseed').addEventListener('click', () => setState({ seed: newSeed() }));
  $('#randomize').addEventListener('click', () => setState(randomize()));
  $('#reset').addEventListener('click', () => setState({ ...DEFAULTS }));
  $('#save-map').addEventListener('click', openSave);
  $('#home').addEventListener('click', goHome);
  $('#new-map').addEventListener('click', (e) => openNew(e.currentTarget));
  $('#new-map-empty').addEventListener('click', (e) => openNew(e.currentTarget));
  window.addEventListener('hashchange', async () => {
    if (dialogOpen()) {
      setHash(screen);
      return;
    }
    if (location.hash === EDITOR_HASH) {
      if (screen !== 'editor') showScreen('editor');
    } else if (screen === 'editor' && !(await goHome())) {
      setHash('editor');
    } else if (screen === 'start') {
      setHash('start');
    }
  });
  $('#download').addEventListener('click', doExport);
  $('#copy').addEventListener('click', doCopy);
  $('#shuffle').addEventListener('click', shuffle);
}

function bindDialogs() {
  $('#load-map').addEventListener('click', openLoad);
  $('#save-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitSave();
  });
  $('#save-dialog').addEventListener('close', cancelSave);
  $$('input[name="save-mode"]').forEach((r) => r.addEventListener('change', syncSaveMode));
  $('#save-name').addEventListener('input', () => setSaveError(null));
  $('#tab-saved').addEventListener('click', () => selectTab('saved'));
  $('#tab-templates').addEventListener('click', () => selectTab('templates'));
  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const toSaved = e.key === 'Home' || (e.key !== 'End' && $('#tab-templates').getAttribute('aria-selected') === 'true');
      selectTab(toSaved ? 'saved' : 'templates', true);
    }
  });
}

function bindZoom() {
  $('#zoom-in').addEventListener('click', () => setZoom(zoomIn(zoom)));
  $('#zoom-out').addEventListener('click', () => setZoom(zoomOut(zoom)));
  $('#zoom-fit').addEventListener('click', fit);
  $('#zoom-actual').addEventListener('click', () => setZoom(1));
  new ResizeObserver(() => { if (fitMode) layout(); }).observe(viewport);

  view.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    updateCursor();
  });
  view.addEventListener('pointerleave', () => {
    pointer = null;
    updateCursor();
  });
  viewport.addEventListener('scroll', () => { if (pointer) updateCursor(); }, { passive: true });
}

function bindShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (!dialogOpen() && screen === 'editor') openSave();
      return;
    }
    if (dialogOpen() || screen !== 'editor') return;
    if (e.key === 'Escape' && hideTip()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox' && e.target.type !== 'radio') return;
    if (tag === 'select' || tag === 'textarea') return;
    if (e.key === 'r' || e.key === 'R') setState({ seed: newSeed() });
    else if (e.key === 't' || e.key === 'T') {
      state.tilePreview = !state.tilePreview;
      writeControls();
      onChange('tilePreview');
    } else if (e.key === '+' || e.key === '=') setZoom(zoomIn(zoom));
    else if (e.key === '-' || e.key === '_') setZoom(zoomOut(zoom));
    else if (e.key === '0') fit();
  });
}

setupHelp(HELP, { tip: $('#tooltip'), scrollers: [$('.steps')] });
$('#save-name').maxLength = NAME_MAX;
syncCurrent();
buildSheet();
writeControls();
updateDoc();
bindFields();
bindDocument();
bindDialogs();
bindZoom();
bindShortcuts();
updateCursor();
showScreen(screen, { focus: false });
