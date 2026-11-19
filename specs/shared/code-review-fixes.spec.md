# Code review fixes — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-19

# Part 1 — Business logic and usage

A full review of the app after the four feature specs found no exploitable security flaws, a handful of low-severity bugs, and clean-code issues. This spec fixes the bugs, hardens the page, and tidies the code without changing what the user sees, except where a bug fix says so. The user asked for the fixes to be decided autonomously; every decision is recorded here.

- **Users:** everyone using Noisemaker; most changes are invisible.
- **Bugs fixed (user-visible):**
  1. Changing the URL hash (typing or removing `#editor`) while a dialog is open does nothing: the hash is put back and the dialog stays. Previously the screen switched underneath the dialog, and with a confirm already open, one "Discard" could resolve two prompts and wipe the map just loaded.
  2. A save that fails because the thumbnail couldn't be rendered says "Couldn't render the thumbnail: <reason>" instead of blaming browser storage.
  3. Closing the Save dialog while a save is rendering its thumbnail cancels that save; Save can be opened again at once.
  4. If browser storage is full when the current settings or map are stored, a toast says "Browser storage is full. Changes won't survive a reload." It shows at most once per page load.
  5. Leaving the editor with discarded changes clears the canvas, so the old map no longer flashes when the editor opens next.
  6. The Resolution help text says the preview renders at up to 512 pixels when fitted and sharpens to full resolution when zoomed in.
  7. The export toast uses the same format labels as the status bar ("WebP", "RAW16").
- **Hardening:**
  - The page declares a Content-Security-Policy allowing only its own scripts, styles and workers, images from itself and `data:`/`blob:`, and no plugins, base URL changes or form posts.
  - Saved-map thumbnails are only accepted as base64 JPEG or PNG data URLs of at most 200 000 characters; anything else is dropped (the map keeps loading without a thumbnail).
- **Out of scope:** a custom domain, removing `prototype/` from GitHub Pages, CI, visual changes.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Changes

**`index.html`**
- `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; worker-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">` as the first element after the charset.
- The inline screen script moves to `js/boot.js`, loaded as a classic `<script src>` in `<head>` so the right screen still paints first.
- `#save-name` drops `maxlength`; `app.js` sets `maxLength` from `NAME_MAX`.

**`js/maps.js`**
- `THUMB_MAX = 200000`. `cleanMap` keeps `thumb` only if it starts with `data:image/jpeg;base64,` or `data:image/png;base64,` and is at most `THUMB_MAX` long.
- The never-read `template` field is removed from `current` (`defaultCurrent`, `loadCurrent`, `startMap`). Stored current maps with the field still load; it is ignored. `specs/shared/saved-maps.spec.md` and `start-screen.spec.md` are updated to match, with a note.

**New `js/visibility.js`**: `matches(expr, state)`, the `data-show` parser (`&` joins clauses, `k=v` / `k!=v`, `|` separates allowed values), moved from `app.js`.

**New `js/tooltip.js`**: the info-button tooltip (`placeTip`, `showTip`, `hideTip`, delay and state), following the `js/dialogs.js` pattern. Exports `setupHelp(help)`, `hideTip()` (returns whether a tooltip was open).

**`js/library.js`**: exports `THUMB_SIZE = 128`, used for saved thumbnails, template canvases and by `app.js`; `renderTemplateList` loses its `size` option. `mapCard` is no longer exported.

**`js/dialogs.js`**: `firstStop` no longer exported. `confirmDialog` resolves `false` immediately when the confirm dialog is already open.

**`js/noise.js`**: `hash`, `valueNoise`, `perlin`, `worley` no longer exported.

**`js/settings.js`**: `VIEW_KEYS` is removed. `onChange` keeps its explicit checks, which are clearer than the set.

**`js/app.js`**
- `hashchange`: when `dialogOpen()`, `setHash(screen)` and return.
- Save: `submitSave` keeps the thumbnail worker in `saveJob`; the Save dialog's `close` event terminates it and resets `saving`. A thumbnail failure (anything but cancellation) sets the error `thumb` with the message; a cancellation returns silently.
- `persist()` and `setCurrent()` check the return of `saveSettings`/`saveCurrent` and call `warnStorage()`, which toasts once.
- `clearEditor` clears `#view`.
- Helpers: `attachMap(map)` and `detachCurrent()` replace the repeated `setCurrent` objects; `stopPreview()` replaces the duplicated worker shutdown.
- `bind()` is split into `bindFields`, `bindDocument`, `bindDialogs`, `bindZoom` and `bindShortcuts`.
- The export toast uses `FORMAT_LABELS`.

**`js/help.js`**: corrected `size` text.

**`css/style.css`**: the repeated hardcoded greys become `:root` tokens; values unchanged.

**Tests**
- `tests/visibility.test.js`: operators of `matches`.
- `tests/html.test.js`: range min/max equal `RANGES`, select and radio values equal `OPTIONS`, every `data-show` key exists in `DEFAULTS`, and the CSP meta is present with no inline scripts.
- `tests/maps.test.js`: thumbnail acceptance rules; `current` without `template`.
- `tests/encoders.test.js` uses `OPTIONS.format`; redundant cases in `tests/settings.test.js` go.

**`CLAUDE.md`**: the Layout entry for `tests/` no longer lists modules.

# Part 3 — TODO

- [ ] **Bugs**
  - [ ] Hash change ignored while a dialog is open; `confirmDialog` refuses a second open
  - [ ] Save: cancel on dialog close, `thumb` error code and message
  - [ ] Storage-full toast
  - [ ] Clear the canvas in `clearEditor`
  - [ ] Help text and export toast label
  - [ ] Run tests
- [ ] **Hardening**
  - [ ] CSP meta and `js/boot.js`
  - [ ] Thumbnail data URL rules with tests
  - [ ] Run tests
- [ ] **Clean code**
  - [ ] `attachMap`, `detachCurrent`, `stopPreview`; drop `template` and update the older specs
  - [ ] Move `matches` to `js/visibility.js` with tests
  - [ ] Move tooltip code to `js/tooltip.js`
  - [ ] Split `bind()`
  - [ ] `THUMB_SIZE`, `NAME_MAX` from one place; drop dead exports and `VIEW_KEYS`
  - [ ] CSS colour tokens
  - [ ] HTML consistency test; test cleanups; `CLAUDE.md`
  - [ ] Run tests
- [ ] **Wrap-up**
  - [ ] Check every flow in the browser with no console errors or CSP violations
  - [ ] Open the pull request
