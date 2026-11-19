import { sanitize } from './settings.js';

export const SETTINGS_KEY = 'noisemaker:settings:v1';

export function loadSettings(storage) {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return sanitize(raw ? JSON.parse(raw) : {});
  } catch {
    return sanitize({});
  }
}

export function saveSettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
