# Saved maps — Spec

**Type:** feature
**Status:** approved
**Last updated:** 2026-11-19

# Part 1 — Business logic and usage

So far Noisemaker only remembers the last used settings. This spec lets users keep named maps in the browser: save the current map, reopen it later, overwrite it or save a copy as a new map. Presets become templates: they leave the editor's dock and are only reachable through a "Load map" dialog, next to the user's saved maps. The next spec adds a start screen that lists the saved maps and a "New map" action, so the store and the saved-map list built here are made to be reused there.

- **Users:** game developers and technical artists who tune several maps over time (a terrain heightmap, a cloud mask, a crack texture) and want to come back to each one instead of re-dialling it.
- **Usage:**
  1. The top bar shows, after the brand, the name of the map being edited. A never-saved map shows "Untitled map" or the name of the template it started from, with a dimmed "Not saved" note. When the map has changes that aren't saved, a dot marker follows the name ("Unsaved changes" for assistive tech), and the browser tab title starts with "• ".
  2. The right side of the top bar holds "Load map" and "Save". Randomize and Reset stay where they are.
  3. **Save** (button, or Cmd/Ctrl+S anywhere in the app):
     - For a map that has never been saved, a "Save map" dialog asks for a name (pre-filled with the current name; "Untitled map" for a blank map, the template name for a template) and saves it as a new saved map. The map then is that saved map: its name shows in the top bar and the marker disappears.
     - For a map that was opened from (or last saved as) a saved map, the dialog offers two choices: "Overwrite “<name>”" (selected by default) and "Save as new map" with a name field (pre-filled with "<name> copy"). Overwrite replaces that saved map's settings and thumbnail; Save as new creates another saved map and the editor switches to it.
     - Templates are never changed: a map started from a template always saves as new.
     - The name is trimmed, collapsed to single spaces and limited to 60 characters. An empty name shows "Enter a name" under the field and keeps the dialog open. Names don't have to be unique.
     - If browser storage is full, the dialog stays open with "Browser storage is full. Delete some saved maps and try again." If storage is unavailable (blocked by the browser), it says "Saving isn't available: this browser is blocking local storage." If the map to overwrite was deleted in another tab, it says "This map no longer exists. Save it as a new map." and switches the choice to Save as new.
     - On success a toast says "Saved “<name>”".
  4. **Load map** opens a "Load map" dialog with two tabs: "Saved maps" and "Templates". It opens on Saved maps when there is at least one, otherwise on Templates.
     - Saved maps: a grid of cards, newest edit first, each with the thumbnail, the name and "Edited <when>" ("Just now", "5 min ago", "3 h ago", "Yesterday", or a date). The map currently open is marked "Open". Each card has a delete button (trash icon, "Delete <name>"). Empty state: "No saved maps yet. Use Save or Ctrl+S to keep the current map."
     - Templates: the nine presets (Clouds, Terrain, Mountains, Marble, Smoke, Cells, Cracks, Stone, Static) as cards with thumbnail and name.
     - Choosing a card loads it into the editor and closes the dialog. A saved map loads exactly as saved. A template starts a new, never-saved map from the template's settings on the default seed (so it matches its thumbnail), keeping the current export resolution, format, quality and Tile 2×2 view.
     - If the current map has unsaved changes, choosing a card first asks "Discard unsaved changes to “<name>”?" with "Cancel" and "Discard changes". Cancel keeps everything as it is.
     - Delete asks "Delete “<name>”? This can't be undone." with "Cancel" and "Delete". Deleting the map that is currently open keeps it in the editor as a never-saved map with the same name and settings, marked unsaved.
  5. Reloading the page restores the map being edited: its settings, which saved map or template it came from, and its unsaved-changes state.
  6. Exported file names use the map's name: `noisemaker_<name>_<seed>_<size>.<ext>`, with the name lowercased and anything other than letters and digits turned into `_`; a blank "Untitled map" uses the noise type as before.
  7. Dialogs are modal: the rest of the app can't be used while one is open, focus moves into the dialog and returns to the button that opened it, Tab stays inside, Escape or Cancel closes it, and each dialog has a visible, labelled title.
- **Rules:**
  - A saved map stores: a unique id, its name, its map settings (every setting except the Tile 2×2 view toggle, which is a view preference), a small thumbnail, and created and last-updated times.
  - Saved maps loaded from storage are cleaned: settings go through the existing `sanitize` (unknown or removed values fall back to defaults), entries without an id or name are dropped, and broken thumbnails or times are replaced by empty values. Unreadable storage counts as no saved maps and never crashes the app.
  - "Unsaved changes" means the current settings (ignoring Tile 2×2) differ from the saved map or template the map came from. A blank map compares against the defaults. A map whose saved copy was deleted always counts as unsaved.
  - Templates are read-only data and are never written to storage.
  - Ordering of saved maps is by last update, newest first; ties by creation time, newest first.
- **Out of scope:** the start screen and "New map" (next spec; the brand area on the left of the top bar is where its "back to start screen" action will go), renaming or duplicating saved maps from the list, importing/exporting saved maps as files, syncing between tabs live, user-defined templates, a "save" for view state such as zoom.

# Part 2 — Technical details

## 2.1 Tools and libraries
Plain HTML, CSS and ES modules as before; native `<dialog>` with `showModal()` for the modals. No new dependencies.

## 2.2 Structure

**New pure module (no DOM, tested under Node): `js/maps.js`**
- `MAPS_KEY = 'noisemaker:maps:v1'` (a JSON array of saved maps), `CURRENT_KEY = 'noisemaker:current:v1'` (the map being edited), `NAME_MAX = 60`, `UNTITLED = 'Untitled map'`.
- `mapSettings(settings)`: sanitised copy without `tilePreview`.
- `isDirty(settings, base)`: `true` when `base` is `null`, otherwise whether any `mapSettings` key differs.
- `cleanName(raw)`: string, trimmed, whitespace collapsed, cut to `NAME_MAX`; `''` when nothing is left.
- `copyName(name)`: `cleanName(name + ' copy')`, cutting the original so " copy" fits.
- `fileSlug(name)`: lowercase, runs of non `[a-z0-9]` → `_`, trimmed of `_`.
- `formatEdited(ts, now)`: "Just now" (< 1 min), "N min ago" (< 1 h), "N h ago" (< 24 h, same or not), "Yesterday" (previous calendar day), else `new Date(ts).toLocaleDateString()`.
- `listMaps(storage)`: cleaned saved maps sorted as in the rules; `[]` on missing, unreadable or non-array data.
- `getMap(storage, id)`: the cleaned map or `null`.
- `createMap(storage, { name, settings, thumb }, { now = Date.now(), makeId })`: `{ ok: true, map }` or `{ ok: false, error }` with `error` one of `'name'` (empty after cleaning), `'full'` (quota exceeded), `'unavailable'` (storage missing or throwing otherwise). `makeId` defaults to `crypto.randomUUID()` with a time+random fallback.
- `overwriteMap(storage, id, { settings, thumb }, { now })`: same result shape, plus `'missing'` when the id isn't stored; keeps `name`, `id` and `created`, sets `updated`.
- `deleteMap(storage, id)`: `{ ok: true }` or `{ ok: false, error }` (`'unavailable'`); deleting an unknown id is a no-op success.
- `loadCurrent(storage)` / `saveCurrent(storage, current)`: `current` is `{ mapId: string|null, template: string|null, name: string, base: settings|null }`. `loadCurrent` returns a cleaned value (default `{ mapId: null, template: null, name: UNTITLED, base: mapSettings(DEFAULTS) }`), sanitising `base` when present.
- Quota detection: a thrown error whose `name` is `QuotaExceededError` or `NS_ERROR_DOM_QUOTA_REACHED`, or whose `code` is 22 or 1014.

**New UI module: `js/library.js`** (DOM, reusable by the start screen)
- `mapCard({ name, meta, thumb, open })`: builds the card `<li class="map-card">` containing a `<button class="map-open">` (thumbnail `<img>` or `<canvas>`, name, meta line) and returns `{ item, open, thumbSlot }` so callers add handlers and extra buttons.
- `renderSavedList(list, maps, { currentId, now, onOpen, onDelete })`: fills a `<ul>` with saved-map cards (with "Open" badge and delete button) or the empty state.
- `renderTemplateList(list, templates, { onOpen })`: fills a `<ul>` with template cards whose thumbnails are `<canvas>` elements returned for drawing.

**New UI module: `js/dialogs.js`**
- `openDialog(dialog, { opener })`: `showModal()`, remembers the opener and restores focus to it on close, keeps Tab inside the dialog (wrap from last to first focusable and back), closes on Escape via the native `cancel` event.
- `confirmDialog({ title, message, confirm })`: uses the shared `#confirm-dialog`, resolves `true` on confirm and `false` on cancel/Escape.

**Changed files**
- `index.html`:
  - Top bar: after `.brand`, `<div class="doc" id="doc">` with `#doc-name`, `#doc-dirty` (dot, `role="img"`, `aria-label="Unsaved changes"`, hidden when clean) and `#doc-note` ("Not saved", hidden for saved maps). After the existing toolbar, a `.toolbar.toolbar-end` with `#load-map` (folder icon, "Load map") and `#save-map` (save icon, "Save", title "Save (Ctrl+S)").
  - Remove the Presets panel from the dock.
  - Three `<dialog>`s before the tooltip: `#save-dialog` (form with title, choice radios `#save-overwrite` / `#save-new` shown only for saved maps, name field `#save-name` with label and `#save-error` `role="alert"`, Cancel / Save buttons), `#load-dialog` (title, `role="tablist"` with `#tab-saved` / `#tab-templates`, two `role="tabpanel"` lists `#saved-list` and `#template-list`, Close button), `#confirm-dialog` (title, message, Cancel / confirm buttons).
  - Icons: `i-folder`, `i-save`, `i-trash`, `i-close` on the existing 16 px sprite grid.
- `css/style.css`: `.doc` title area (ellipsis, `text-2` note, dot in `text`), `.toolbar-end` pushed right, dialog surface (`panel` background, 1 px `line-strong` border, 4 px radius, the tooltip/toast shadow, `::backdrop` 50% black), dialog header/body/footer, tabs (segmented-style), map card grid (thumbnail 2 px radius, `line` ring, accent ring on hover/focus, "Open" badge in `text-2`), delete icon button, error text in `--error`, narrow layout (icon-only top bar buttons, doc title shrinks, dialog full-width with 16 px gutter). Remove `.presets`/`.preset` rules.
- `js/app.js`:
  - Module state `current` from `loadCurrent(storage)`; `saveCurrent` whenever it changes. Drop `activePreset`, `markPreset`, `applyPreset` and `buildPresets`.
  - `updateDoc()`: writes name, dirty marker, "Not saved" note and `document.title`; called after every settings change and load.
  - Save flow: `openSave()` fills `#save-dialog` for the current mode; submit renders a 128 px thumbnail through a worker (JPEG data URL via an offscreen canvas) and calls `createMap` or `overwriteMap`, then updates `current` (`mapId`, `template: null`, `name`, `base`), toasts, closes; errors stay in the dialog as in Part 1.
  - Load flow: `openLoad()` renders both lists with `js/library.js`, draws template thumbnails once (cached canvases' image data) and selects the tab; `loadSaved(map)` / `loadTemplate(i)` go through `confirmDiscard()` first.
  - Keyboard: Cmd/Ctrl+S (with or without focus in a field; a focused `.num` field is committed first) opens Save; single-key shortcuts are ignored while a dialog is open.
  - `fileName` uses `fileSlug(current.name)` unless the map is a blank untitled one.
- `tests/maps.test.js`: store and helper tests (see TODO A).
- `README.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`: mention saved maps in storage, the new modules, the Load map/Save top bar actions and the dialog component; remove "Saved maps" from PRODUCT's planned list.

## 2.3 Decisions
1. Scope, flow and dialog contents as given in the brief (user via overseer): Save offers Overwrite / Save as new for saved maps, templates always save as new, presets only through Load map, unsaved-changes confirmation, delete with confirmation.
2. Saved maps live in one versioned localStorage key as a JSON array, separate from the last-used settings key, so the start screen can read them without the editor.
3. The store takes the storage object as a parameter like `js/storage.js`, so it is tested under Node with an in-memory storage.
4. Native `<dialog>` + `showModal()` for modality, inertness and Escape; a small Tab wrap added on top. Rejected: a hand-built overlay, which needs its own inert handling.

## Assumptions
Recorded because this sub-session runs autonomously without stopping for approval.
- A1. Thumbnails are 128 × 128 JPEG data URLs (quality 0.85, about 5–10 KB). Noise compresses poorly as PNG (about 25–30 KB at 128 px), which would cap storage at roughly 150 maps; JPEG allows several hundred, and the thumbnail is only a preview.
- A2. Tile 2×2 is a view preference: not stored with a map, not counted as a change, kept when loading.
- A3. Export resolution, format and quality are part of the map and saved with it.
- A4. A template loads on the default seed (1337) so it looks like its thumbnail; the foundation kept the current seed when applying a preset.
- A5. Duplicate names are allowed; the edit time tells maps apart.
- A6. Deleting the open map keeps the editor contents as an unsaved map, rather than resetting the editor.
- A7. No `beforeunload` prompt: the map being edited, including unsaved changes, is restored on reload.
- A8. Randomize and Reset change the current map's settings (making it unsaved) instead of starting a new map; "New map" belongs to the start screen spec.
- A9. The unsaved marker is a dot after the name (Photoshop-style), plus "• " in the tab title.
- A10. Multiple tabs aren't synced live; every store operation reads fresh from storage, and overwriting a map deleted elsewhere reports it.
- A11. The future "back to start screen" action takes the brand's place on the left of the top bar; this spec leaves the brand static.
- A12. Cmd/Ctrl+S works even while typing in a field, because the browser's own "save page" is never what the user wants here.
- A13. Save and Load map are `.tool` buttons like Randomize and Reset; the accent fill stays on the dialogs' primary action only.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: 53 tests passing.

### A. Saved-maps store
- [ ] A1. `js/maps.js` with the constants and helpers `mapSettings`, `isDirty`, `cleanName`, `copyName`, `fileSlug`, `formatEdited`.
- [ ] A2. Store functions `listMaps`, `getMap`, `createMap`, `overwriteMap`, `deleteMap`, `loadCurrent`, `saveCurrent` with quota detection.
- [ ] A3. `tests/maps.test.js`: create (id, times, cleaned name, empty-name error), overwrite (keeps id/name/created, updates settings/updated, missing id), save-as-new next to an existing map, list order, delete (and unknown id), get, corrupt JSON and non-array data, entries with missing fields or old settings (`simplex`), storage full (`QuotaExceededError`) and unavailable storage, `isDirty` ignoring `tilePreview`, `cleanName`, `copyName`, `fileSlug`, `formatEdited`, `loadCurrent` defaults and sanitising.

### B. Markup and styles
- [ ] B1. `index.html`: top bar doc title and Load map / Save buttons, new icons, the three dialogs; remove the Presets panel.
- [ ] B2. `css/style.css`: doc title, end toolbar, dialogs, tabs, map cards, errors, narrow layout; remove the preset styles.

### C. Editor wiring
- [ ] C1. `js/dialogs.js` (`openDialog`, `confirmDialog`) and `js/library.js` (`mapCard`, `renderSavedList`, `renderTemplateList`).
- [ ] C2. `js/app.js`: `current` state and persistence, `updateDoc`, removal of the preset code, file names from the map name.
- [ ] C3. `js/app.js`: Save dialog flow (new, overwrite, save as new, errors, thumbnails) and Cmd/Ctrl+S.
- [ ] C4. `js/app.js`: Load dialog flow (tabs, saved list, templates, discard confirmation, delete confirmation, deleting the open map).

### D. Docs
- [ ] D1. Update `README.md`, `CLAUDE.md`, `PRODUCT.md` and `DESIGN.md` as in 2.2.

### Z. Wrap-up
- [ ] Z1. `npm test` passes.
- [ ] Z2. Manual check via `python3 -m http.server 5173`: save new, overwrite, save as new, load template, load saved, delete (including the open map), unsaved-changes prompt, Cmd/Ctrl+S, storage-full message (simulated), reload persistence, keyboard-only dialog use, narrow layout, no console errors.
