import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings, SETTINGS_KEY } from '../js/storage.js';
import { DEFAULTS } from '../js/settings.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('settings round-trip through storage', () => {
  const storage = memoryStorage();
  const settings = { ...DEFAULTS, type: 'worley', contrast: 0, seed: 42 };
  assert.equal(saveSettings(storage, settings), true);
  assert.deepEqual(loadSettings(storage), settings);
});

test('empty storage gives defaults', () => {
  assert.deepEqual(loadSettings(memoryStorage()), { ...DEFAULTS });
});

test('corrupt JSON gives defaults', () => {
  const storage = memoryStorage();
  storage.setItem(SETTINGS_KEY, '{not json');
  assert.deepEqual(loadSettings(storage), { ...DEFAULTS });
});

test('stored simplex type is replaced by the default type', () => {
  const storage = memoryStorage();
  storage.setItem(SETTINGS_KEY, JSON.stringify({ type: 'simplex', seed: 5 }));
  const s = loadSettings(storage);
  assert.equal(s.type, DEFAULTS.type);
  assert.equal(s.seed, 5);
});

test('unavailable storage does not throw', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadSettings(broken), { ...DEFAULTS });
  assert.equal(saveSettings(broken, DEFAULTS), false);
  assert.deepEqual(loadSettings(undefined), { ...DEFAULTS });
});
