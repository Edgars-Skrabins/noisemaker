process.env.TZ = 'Europe/Riga';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS_KEY, CURRENT_KEY, NAME_MAX, UNTITLED,
  mapSettings, isDirty, cleanName, copyName, fileSlug, formatEdited,
  listMaps, getMap, createMap, overwriteMap, deleteMap, loadCurrent, saveCurrent,
} from '../js/maps.js';
import { DEFAULTS } from '../js/settings.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

const THUMB = 'data:image/jpeg;base64,AAAA';

test('create stores a cleaned map with id and times', () => {
  const storage = memoryStorage();
  const res = createMap(storage, { name: '  My   terrain ', settings: { ...DEFAULTS, scale: 7 }, thumb: THUMB }, { now: 1000, makeId: ids() });
  assert.equal(res.ok, true);
  assert.deepEqual(res.map, { id: 'id1', name: 'My terrain', settings: mapSettings({ ...DEFAULTS, scale: 7 }), thumb: THUMB, created: 1000, updated: 1000 });
  assert.equal('tilePreview' in res.map.settings, false);
  assert.deepEqual(listMaps(storage), [res.map]);
});

test('create rejects an empty name without writing', () => {
  const storage = memoryStorage();
  assert.deepEqual(createMap(storage, { name: '   ', settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'name' });
  assert.equal(storage.getItem(MAPS_KEY), null);
});

test('overwrite keeps id, name and created and replaces settings, thumb and updated', () => {
  const storage = memoryStorage();
  const { map } = createMap(storage, { name: 'A', settings: DEFAULTS, thumb: THUMB }, { now: 1000, makeId: ids() });
  const res = overwriteMap(storage, map.id, { settings: { ...DEFAULTS, warp: 1.5 }, thumb: 'data:image/jpeg;base64,BBBB' }, { now: 5000 });
  assert.equal(res.ok, true);
  assert.equal(res.map.id, map.id);
  assert.equal(res.map.name, 'A');
  assert.equal(res.map.created, 1000);
  assert.equal(res.map.updated, 5000);
  assert.equal(res.map.settings.warp, 1.5);
  assert.equal(res.map.thumb, 'data:image/jpeg;base64,BBBB');
  assert.equal(listMaps(storage).length, 1);
});

test('overwrite of a missing map reports it', () => {
  const storage = memoryStorage();
  assert.deepEqual(overwriteMap(storage, 'nope', { settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'missing' });
});

test('save as new adds a second map and leaves the first unchanged', () => {
  const storage = memoryStorage();
  const makeId = ids();
  const first = createMap(storage, { name: 'Rocks', settings: DEFAULTS, thumb: THUMB }, { now: 1000, makeId }).map;
  const second = createMap(storage, { name: copyName('Rocks'), settings: { ...DEFAULTS, seed: 9 }, thumb: THUMB }, { now: 2000, makeId }).map;
  assert.notEqual(first.id, second.id);
  assert.equal(second.name, 'Rocks copy');
  assert.deepEqual(getMap(storage, first.id), first);
  assert.equal(getMap(storage, second.id).settings.seed, 9);
});

test('list is ordered by last update, then creation, newest first', () => {
  const storage = memoryStorage();
  const makeId = ids();
  createMap(storage, { name: 'old', settings: DEFAULTS, thumb: THUMB }, { now: 1000, makeId });
  createMap(storage, { name: 'mid', settings: DEFAULTS, thumb: THUMB }, { now: 2000, makeId });
  createMap(storage, { name: 'tie', settings: DEFAULTS, thumb: THUMB }, { now: 2000, makeId });
  assert.deepEqual(listMaps(storage).map((m) => m.name), ['mid', 'tie', 'old']);
  overwriteMap(storage, 'id1', { settings: DEFAULTS, thumb: THUMB }, { now: 9000 });
  assert.deepEqual(listMaps(storage).map((m) => m.name), ['old', 'mid', 'tie']);
});

test('ties on update are broken by newest creation', () => {
  const storage = memoryStorage();
  storage.setItem(MAPS_KEY, JSON.stringify([
    { id: 'a', name: 'a', settings: {}, created: 1, updated: 5 },
    { id: 'b', name: 'b', settings: {}, created: 3, updated: 5 },
  ]));
  assert.deepEqual(listMaps(storage).map((m) => m.id), ['b', 'a']);
});

test('delete removes a map and ignores unknown ids', () => {
  const storage = memoryStorage();
  const makeId = ids();
  const a = createMap(storage, { name: 'a', settings: DEFAULTS, thumb: THUMB }, { now: 1, makeId }).map;
  const b = createMap(storage, { name: 'b', settings: DEFAULTS, thumb: THUMB }, { now: 2, makeId }).map;
  assert.deepEqual(deleteMap(storage, a.id), { ok: true });
  assert.deepEqual(listMaps(storage), [b]);
  assert.equal(getMap(storage, a.id), null);
  assert.deepEqual(deleteMap(storage, 'nope'), { ok: true });
  assert.deepEqual(listMaps(storage), [b]);
});

test('corrupt or non-array data reads as no maps', () => {
  const storage = memoryStorage();
  storage.setItem(MAPS_KEY, '{not json');
  assert.deepEqual(listMaps(storage), []);
  storage.setItem(MAPS_KEY, JSON.stringify({ id: 'x' }));
  assert.deepEqual(listMaps(storage), []);
  assert.deepEqual(listMaps(undefined), []);
});

test('old or partial entries are cleaned and invalid ones dropped', () => {
  const storage = memoryStorage();
  storage.setItem(MAPS_KEY, JSON.stringify([
    { id: 'old', name: 'Legacy', settings: { type: 'simplex', seed: 5, scale: 999 } },
    { id: '', name: 'no id', settings: {} },
    { id: 'noname', name: '   ', settings: {} },
    null,
    'text',
    { id: 'old', name: 'duplicate id', settings: {} },
    { id: 'bad', name: 'Bad thumb', settings: null, thumb: 'javascript:alert(1)', created: 'x', updated: NaN },
  ]));
  const maps = listMaps(storage);
  assert.deepEqual(maps.map((m) => m.id).sort(), ['bad', 'old']);
  const legacy = maps.find((m) => m.id === 'old');
  assert.equal(legacy.settings.type, DEFAULTS.type);
  assert.equal(legacy.settings.seed, 5);
  assert.equal(legacy.settings.scale, 32);
  const bad = maps.find((m) => m.id === 'bad');
  assert.equal(bad.thumb, '');
  assert.equal(bad.created, 0);
  assert.equal(bad.updated, 0);
  assert.deepEqual(bad.settings, mapSettings(DEFAULTS));
});

test('a full storage reports full and keeps existing maps', () => {
  const storage = memoryStorage();
  const kept = createMap(storage, { name: 'kept', settings: DEFAULTS, thumb: THUMB }, { now: 1, makeId: ids() }).map;
  const full = {
    getItem: storage.getItem,
    setItem() { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; },
  };
  assert.deepEqual(createMap(full, { name: 'x', settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'full' });
  assert.deepEqual(overwriteMap(full, kept.id, { settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'full' });
  const firefox = { getItem: storage.getItem, setItem() { const e = new Error('q'); e.code = 1014; throw e; } };
  assert.deepEqual(createMap(firefox, { name: 'x', settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'full' });
  assert.deepEqual(listMaps(storage), [kept]);
});

test('unavailable storage reports unavailable and never throws', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(createMap(broken, { name: 'x', settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'unavailable' });
  assert.deepEqual(overwriteMap(broken, 'a', { settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'unavailable' });
  assert.deepEqual(deleteMap(broken, 'a'), { ok: false, error: 'unavailable' });
  assert.deepEqual(createMap(undefined, { name: 'x', settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'unavailable' });
  assert.deepEqual(listMaps(broken), []);
  assert.equal(getMap(broken, 'a'), null);
  const readOnly = { getItem: () => null, setItem() { throw new Error('denied'); } };
  assert.deepEqual(createMap(readOnly, { name: 'x', settings: DEFAULTS, thumb: THUMB }), { ok: false, error: 'unavailable' });
});

test('isDirty compares map settings and ignores the tile view', () => {
  const base = mapSettings(DEFAULTS);
  assert.equal(isDirty(DEFAULTS, base), false);
  assert.equal(isDirty({ ...DEFAULTS, tilePreview: true }, base), false);
  assert.equal(isDirty({ ...DEFAULTS, seed: 2 }, base), true);
  assert.equal(isDirty({ ...DEFAULTS, format: 'tga' }, base), true);
  assert.equal(isDirty(DEFAULTS, null), true);
});

test('cleanName trims, collapses and limits names', () => {
  assert.equal(cleanName('  a \n\t b  '), 'a b');
  assert.equal(cleanName(''), '');
  assert.equal(cleanName(null), '');
  assert.equal(cleanName('x'.repeat(100)).length, NAME_MAX);
  assert.equal(cleanName('a'.repeat(59) + ' b'), 'a'.repeat(59));
});

test('copyName appends copy within the length limit', () => {
  assert.equal(copyName('Clouds'), 'Clouds copy');
  const long = copyName('y'.repeat(NAME_MAX));
  assert.equal(long.length, NAME_MAX);
  assert.ok(long.endsWith(' copy'));
});

test('fileSlug makes file-safe names', () => {
  assert.equal(fileSlug('My Terrain #2'), 'my_terrain_2');
  assert.equal(fileSlug('  --Clouds--  '), 'clouds');
  assert.equal(fileSlug('Ünïcode map'), 'n_code_map');
});

test('formatEdited describes recent and older edits', () => {
  const now = new Date(2026, 10, 19, 15, 0, 0).getTime();
  assert.equal(formatEdited(now - 10000, now), 'just now');
  assert.equal(formatEdited(now - 5 * 60000, now), '5 min ago');
  assert.equal(formatEdited(now - 3 * 3600000, now), '3 h ago');
  assert.equal(formatEdited(new Date(2026, 10, 18, 9, 0).getTime(), now), 'yesterday');
  const older = new Date(2026, 10, 10, 12, 0).getTime();
  assert.equal(formatEdited(older, now), 'on ' + new Date(older).toLocaleDateString());
});

test('yesterday follows calendar days across a daylight saving change', () => {
  const now = new Date(2026, 9, 26, 0, 30).getTime();
  const lateYesterday = new Date(2026, 9, 25, 0, 30).getTime();
  assert.equal(now - lateYesterday, 25 * 3600000);
  assert.equal(formatEdited(lateYesterday, now), 'yesterday');
  const twoDaysAgo = new Date(2026, 9, 24, 23, 0).getTime();
  assert.equal(formatEdited(twoDaysAgo, now), 'on ' + new Date(twoDaysAgo).toLocaleDateString());
});

test('loadCurrent gives a blank untitled map by default and on bad data', () => {
  const blank = { mapId: null, template: null, name: UNTITLED, base: mapSettings(DEFAULTS) };
  const storage = memoryStorage();
  assert.deepEqual(loadCurrent(storage), blank);
  storage.setItem(CURRENT_KEY, '{oops');
  assert.deepEqual(loadCurrent(storage), blank);
  assert.deepEqual(loadCurrent(undefined), blank);
});

test('current map round-trips and is sanitised', () => {
  const storage = memoryStorage();
  assert.equal(saveCurrent(storage, { mapId: 'id1', template: null, name: 'Rocks', base: { ...DEFAULTS, type: 'simplex' } }), true);
  const cur = loadCurrent(storage);
  assert.equal(cur.mapId, 'id1');
  assert.equal(cur.name, 'Rocks');
  assert.equal(cur.base.type, DEFAULTS.type);
  saveCurrent(storage, { mapId: 5, template: 'Clouds', name: '', base: null });
  assert.deepEqual(loadCurrent(storage), { mapId: null, template: 'Clouds', name: UNTITLED, base: null });
});
