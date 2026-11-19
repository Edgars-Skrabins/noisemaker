import { DEFAULTS, sanitize } from './settings.js';

export const MAPS_KEY = 'noisemaker:maps:v1';
export const CURRENT_KEY = 'noisemaker:current:v1';
export const NAME_MAX = 60;
export const UNTITLED = 'Untitled map';

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function mapSettings(settings) {
  const out = sanitize(settings);
  delete out.tilePreview;
  return out;
}

export function isDirty(settings, base) {
  if (!base) return true;
  const a = mapSettings(settings);
  const b = mapSettings(base);
  return Object.keys(a).some((k) => a[k] !== b[k]);
}

export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
}

export function copyName(name) {
  const suffix = ' copy';
  return cleanName(cleanName(name).slice(0, NAME_MAX - suffix.length).trim() + suffix);
}

export function fileSlug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function formatEdited(ts, now = Date.now()) {
  const diff = now - ts;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  if (ts >= day.getTime() - DAY) return 'yesterday';
  return 'on ' + new Date(ts).toLocaleDateString();
}

function defaultId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function isQuota(err) {
  return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);
}

function time(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function cleanMap(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' && entry.id ? entry.id : null;
  const name = cleanName(entry.name);
  if (!id || !name) return null;
  const thumb = typeof entry.thumb === 'string' && entry.thumb.startsWith('data:image/') ? entry.thumb : '';
  return { id, name, settings: mapSettings(entry.settings), thumb, created: time(entry.created), updated: time(entry.updated) };
}

function readRaw(storage) {
  const raw = storage.getItem(MAPS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function readClean(storage) {
  const seen = new Set();
  return readRaw(storage).map(cleanMap).filter((m) => m && !seen.has(m.id) && seen.add(m.id));
}

function write(storage, maps) {
  try {
    storage.setItem(MAPS_KEY, JSON.stringify(maps));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: isQuota(err) ? 'full' : 'unavailable' };
  }
}

function attempt(storage, fn) {
  if (!storage) return { ok: false, error: 'unavailable' };
  let maps;
  try {
    maps = readClean(storage);
  } catch {
    return { ok: false, error: 'unavailable' };
  }
  return fn(maps);
}

export function listMaps(storage) {
  try {
    return readClean(storage).sort((a, b) => b.updated - a.updated || b.created - a.created);
  } catch {
    return [];
  }
}

export function getMap(storage, id) {
  return listMaps(storage).find((m) => m.id === id) || null;
}

export function createMap(storage, { name, settings, thumb }, { now = Date.now(), makeId = defaultId } = {}) {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: 'name' };
  return attempt(storage, (maps) => {
    const map = cleanMap({ id: makeId(), name: clean, settings, thumb, created: now, updated: now });
    const res = write(storage, [...maps, map]);
    return res.ok ? { ok: true, map } : res;
  });
}

export function overwriteMap(storage, id, { settings, thumb }, { now = Date.now() } = {}) {
  return attempt(storage, (maps) => {
    const i = maps.findIndex((m) => m.id === id);
    if (i < 0) return { ok: false, error: 'missing' };
    const map = cleanMap({ ...maps[i], settings, thumb, updated: now });
    const next = maps.slice();
    next[i] = map;
    const res = write(storage, next);
    return res.ok ? { ok: true, map } : res;
  });
}

export function deleteMap(storage, id) {
  return attempt(storage, (maps) => {
    const next = maps.filter((m) => m.id !== id);
    if (next.length === maps.length) return { ok: true };
    return write(storage, next);
  });
}

function defaultCurrent() {
  return { mapId: null, template: null, name: UNTITLED, base: mapSettings(DEFAULTS) };
}

export function loadCurrent(storage) {
  let raw;
  try {
    raw = JSON.parse(storage.getItem(CURRENT_KEY));
  } catch {
    return defaultCurrent();
  }
  if (!raw || typeof raw !== 'object') return defaultCurrent();
  return {
    mapId: typeof raw.mapId === 'string' && raw.mapId ? raw.mapId : null,
    template: typeof raw.template === 'string' && raw.template ? raw.template : null,
    name: cleanName(raw.name) || UNTITLED,
    base: raw.base && typeof raw.base === 'object' ? mapSettings(raw.base) : null,
  };
}

export function saveCurrent(storage, current) {
  try {
    storage.setItem(CURRENT_KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}
