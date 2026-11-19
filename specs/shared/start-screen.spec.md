# Start screen — Spec

**Type:** feature
**Status:** approved
**Last updated:** 2026-11-19

# Part 1 — Business logic and usage

Noisemaker opens straight into the editor today. This spec adds a start screen: a home for the user's saved maps with a prominent "New map" action, where a new map can start blank or from a template. The editor gets a way back to it. It builds on the saved-maps store, map cards and dialogs from the saved-maps spec and keeps the Load map dialog and Save flow as they are.

- **Users:** game developers and technical artists who keep several maps and come back to pick one up, or start a new one.
- **Usage:**
  1. Opening the app (its URL without `#editor`) shows the start screen. The top bar holds only the brand. Below it, a heading "Your maps" with the number of saved maps ("1 saved map", "3 saved maps") and a "New map" primary button on the right, then a grid of the saved maps, newest edit first, each card with the thumbnail, the name and "Edited <when>", exactly as in the Load map dialog (without the "Open" badge). Each card has the delete button (trash icon, "Delete <name>").
  2. **Empty state** (no saved maps): instead of the grid and the heading's button, a box with "No saved maps yet", "Start a new map from scratch or from a template. Maps you save appear here." and the "New map" primary button.
  3. **New map** opens a "New map" dialog listing "Blank" followed by the nine templates (Clouds, Terrain, Mountains, Marble, Smoke, Cells, Cracks, Stone, Static), as cards with thumbnail and name. Choosing a card opens the editor with that map as a new, never-saved map: "Blank" is the default settings named "Untitled map"; a template is the template's settings on the default seed, named after the template. Both keep the last used export resolution, format and quality and the Tile 2×2 view. Escape or the close button closes the dialog.
  4. **Opening a saved map** (clicking its card) opens it in the editor exactly as saved.
  5. **Delete** asks "Delete “<name>”? This can't be undone." with "Cancel" and "Delete", then refreshes the list (or shows the empty state).
  6. **Back to the start screen:** in the editor the brand (mark and "Noisemaker") on the left of the top bar is a button, titled "Start screen", that returns to the start screen. If the map has unsaved changes, it first asks "Discard unsaved changes to “<name>”?" with "Cancel" and "Discard changes", the same prompt as Load map. Cancel stays in the editor with everything as it was; Discard drops the changes and the editor is left holding a blank map. A map without unsaved changes stays in the editor as it is.
  7. **Unsaved work found on the start screen:** if the map left in the editor has unsaved changes (the tab was closed or the start screen was opened without leaving the editor through the brand), opening a saved map or a new map from the start screen first asks the same discard question.
  8. **Reload:** the screen is reflected in the URL: the editor is `#editor`, the start screen has no hash. Reloading keeps the user on the screen they were on; reloading in the editor restores the map being edited as before. Opening the app's plain URL always shows the start screen. Switching screens replaces the URL instead of adding history entries, so the browser's Back button doesn't switch screens (and can't skip the unsaved-changes prompt). Typing or removing `#editor` in the address bar switches screens through the same flow as the brand button.
  9. The browser tab title is "Noisemaker" on the start screen and, as before, "<name> — Noisemaker" (with "• " for unsaved changes) in the editor.
  10. Keyboard: all cards, buttons and dialogs work with the keyboard. After switching screens, focus moves to the screen's heading (start screen: "Your maps"; editor: the map name). Editor shortcuts (R, T, +, −, 0, Cmd/Ctrl+S) do nothing on the start screen; Cmd/Ctrl+S still doesn't open the browser's save page.
  11. Narrow screens (below 760 px): the start screen scrolls with the page, with a 16 px gutter and the smaller card grid.
- **Rules:**
  - The start screen reads the same saved-maps store as the editor; nothing new is stored, except that leaving the editor with discarded changes stores the blank map as the map being edited.
  - Deleting, on the start screen, the map the editor holds: if that map has no unsaved changes the editor is reset to a blank map (nothing is lost); if it has unsaved changes it becomes a never-saved map with the same name and settings, as in the Load map dialog.
  - Templates and "Blank" are read-only and never stored as saved maps.
- **Out of scope:** renaming, duplicating, searching or sorting saved maps on the start screen; a "continue editing" card for the map left in the editor; recently used templates; browser history entries per screen; user-defined templates.

# Part 2 — Technical details

## 2.1 Tools and libraries
Plain HTML, CSS and ES modules; native `<dialog>` through `js/dialogs.js`. No new dependencies, no router library.

## 2.2 Structure

**Changed pure module: `js/maps.js`**
- `startMap(template, settings)`: returns `{ current, settings }` for a new, never-saved map. `template` is `null` for a blank map or `{ name, settings }`. The map settings are `mapSettings({ ...DEFAULTS, ...template.settings, size, format, quality })`, with `size`, `format` and `quality` taken from `settings`; `current` is `{ mapId: null, template: template ? template.name : null, name: template ? template.name : UNTITLED, base: <map settings> }`.

**Changed UI modules**
- `js/library.js`: unchanged API, reused as is (`renderSavedList` for the start grid, `renderTemplateList` for the New map dialog).
- `js/dialogs.js`: unchanged, reused (`openDialog`, `confirmDialog`).

**`index.html`**
- An inline script in `<head>` sets `document.documentElement.dataset.screen` to `editor` when `location.hash === '#editor'`, else `start`, so the right screen paints first.
- Top bar: `.brand` holds `<button id="home" class="home" type="button" title="Start screen" aria-label="Noisemaker, start screen">` with the mark and `<span class="brand-name">Noisemaker</span>` (the old `<h1>` goes). `#doc-name` becomes an `<h1>` with `tabindex="-1"`.
- After the editor's `<main class="workspace">`, a `<main class="start" id="start" aria-labelledby="start-title">` with `.start-inner`: `.start-head` (`<h1 id="start-title" tabindex="-1">Your maps</h1>`, `#start-count`, `#new-map` primary button with an `i-plus` icon), `<ul class="map-grid start-grid" id="start-list">` and `#start-empty` (`h2`, text, `#new-map-empty` primary button).
- `#new-dialog`: a `dialog-wide` dialog, header "New map" with the close button, body with `<ul class="map-grid" id="new-list">`.
- Icon `i-plus` on the sprite.

**`css/style.css`**
- Screen switch: `[data-screen="start"]` hides `.workspace`, `.doc` and the top bar toolbars; `[data-screen="editor"]` hides `.start`.
- `.home`: tool-style button (24 px, 3 px radius, hover `raised`), brand typography; disabled on the start screen without dimming.
- `.start` (scrolling `pasteboard` surface), `.start-inner` (max 1040 px, 24 px padding), `.start-head` (15 px semibold title, `text-2` count, button pushed right, `line` divider), `.start-grid` (cards min 160 px, 16 px gap), `.start-empty` (`panel` box with `line` border, 4 px radius, centred text).
- Map cards take the focus-ring gap colour from `--card-gap` (default `panel`, `pasteboard` on the start screen).
- Narrow layout: `.brand-name` visually hidden, `.home` 32 px, start padding 16 px, start grid min 104 px.

**`js/app.js`**
- `screen` state from `document.documentElement.dataset.screen`. `showScreen(name)` sets the dataset, replaces the URL hash (`#editor` or none, keeping path and query, via `history.replaceState`), disables `#home` on the start screen, updates the title, and on the editor runs `layout()` and schedules a render when there is none; on the start screen it renders the start list. Focus moves to `#start-title` or `#doc-name`.
- `layout()` returns early while the start screen is shown, so hidden-viewport resizes cost nothing; startup only renders the preview when it opens on the editor.
- `renderStart()`: `syncCurrent()`, then `renderSavedList` into `#start-list` with no current id, or the empty state; updates `#start-count`.
- `clearEditor()`: `startMap(null, state)`, stored as the current map and settings (keeping Tile 2×2), controls rewritten, the last preview dropped; no render while hidden.
- `goHome()`: commits a focused numeric field, closes the tooltip, asks `confirmDiscard` when dirty (`clearEditor()` on discard), then `showScreen('start')`; resolves `false` when cancelled.
- New map: `openNew()` renders "Blank" + `PRESETS` into `#new-list` once, draws their thumbnails, opens `#new-dialog`. Choosing a card: `confirmDiscard`, `startMap`, `setCurrent`, apply the settings, close the dialog, `showScreen('editor')`.
- Opening a saved card on the start screen: `confirmDiscard`, `loadSaved(map)`, `showScreen('editor')`. Deleting: the shared delete confirmation, then the rule in Part 1 for the map the editor holds, then `renderStart()`.
- Template thumbnails: one cache of per-template image promises (Blank first, then the presets), rendered through one worker and shared by the New map dialog and the Load map Templates tab; a failure clears the cache so the next open retries.
- `loadTemplate(i)` uses `startMap`.
- `hashchange`: `#editor` → `showScreen('editor')`; otherwise from the editor → `goHome()`, and on cancel the hash is put back.
- Keyboard: on the start screen Cmd/Ctrl+S is prevented and ignored, other editor shortcuts are ignored.
- `updateDoc()` only sets the tab title in the editor.

**Tests: `tests/maps.test.js`**
- `startMap` for blank and template maps (names, `template`, `mapId`, base equal to the settings, default seed, export settings kept, `tilePreview` not included, template settings applied).

**Docs**
- `README.md`, `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`: the start screen, the New map dialog, the brand as the home button, screens in the URL hash; PRODUCT moves the start screen from Planned to Features.

## 2.3 Decisions
1. Scope from the brief (user via overseer): start screen with saved maps (open, delete), "New map" from blank or a template, brand as the way back with the unsaved-changes prompt, single static page with a simple screen switch.
2. Screens are switched with a `data-screen` attribute on `<html>` and reflected in the URL hash; rejected: a router library (not allowed) and separate HTML pages (would reload the worker and lose the editor state).
3. "New map" is a dialog with "Blank" as the first card, reusing the dialog and template list components; rejected: a template row on the start screen itself, which competes with the saved maps for attention.

## Assumptions
Recorded because this sub-session runs autonomously without stopping for approval.
- A1. Reload keeps the current screen (`#editor` in the URL); the plain URL opens the start screen, so a bookmark or a new visit lands on the start screen.
- A2. Screen switches use `history.replaceState`, so Back doesn't toggle screens and can't bypass the unsaved-changes prompt.
- A3. Discarding changes when leaving the editor resets the editor to a blank map rather than keeping the changes, so "Discard" means what it says and the start screen doesn't ask again.
- A4. Leaving the editor without unsaved changes keeps the map in the editor untouched.
- A5. Because a map with unsaved changes can be left in the editor (tab closed, plain URL opened), opening anything from the start screen asks the same discard question first; no "continue" card is added.
- A6. New maps, blank or from a template, keep the last used export resolution, format and quality, and the Tile 2×2 view, like loading a template in the saved-maps spec. Blank uses the default seed.
- A7. "Blank" gets a thumbnail of the default settings so every card in the New map dialog looks alike.
- A8. Deleting, from the start screen, the clean map the editor holds resets the editor to blank; a dirty one becomes a never-saved map as in the Load map dialog.
- A9. The start screen heading is "Your maps" at 15 px semibold, a new `title` type step; everything else reuses the existing tokens and components.
- A10. The brand button is disabled on the start screen (it is already home) but keeps full contrast.
- A11. The start screen top bar shows only the brand; Load map, Save, Randomize and Reset belong to the editor.
- A12. The Load map dialog keeps its Templates tab, so templates stay reachable from inside the editor.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: 73 tests passing.

### A. Pure logic
- [ ] A1. `js/maps.js`: `startMap(template, settings)`.
- [ ] A2. `tests/maps.test.js`: `startMap` tests as in 2.2.

### B. Markup and styles
- [ ] B1. `index.html`: head screen script, brand home button, `#doc-name` as `h1`, start screen, `#new-dialog`, `i-plus`.
- [ ] B2. `css/style.css`: screen switch, `.home`, start screen, empty state, `--card-gap`, narrow layout.

### C. Wiring
- [ ] C1. `js/app.js`: `screen` state, `showScreen`, `layout` guard, startup on either screen, title handling, `hashchange`, keyboard guards.
- [ ] C2. `js/app.js`: `renderStart`, opening and deleting saved maps on the start screen, `clearEditor`, `goHome` with the discard prompt.
- [ ] C3. `js/app.js`: New map dialog, shared template thumbnail cache, `loadTemplate` through `startMap`.

### D. Docs
- [ ] D1. Update `README.md`, `CLAUDE.md`, `DESIGN.md` and `PRODUCT.md` as in 2.2.

### Z. Wrap-up
- [ ] Z1. `npm test` passes.
- [ ] Z2. Manual check via `python3 -m http.server 5173`: first-run empty state, new blank map, new from template, open saved, delete (including the map the editor holds), back to start with and without unsaved changes (cancel and discard), discard prompt for unsaved work found on the start screen, reload on both screens, typed hash, Load map and Save still working, keyboard use, narrow width, no console errors.
