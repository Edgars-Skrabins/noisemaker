# Editor redesign — Spec

**Type:** feature
**Status:** approved
**Last updated:** 2026-11-19

# Part 1 — Business logic and usage

The foundation app works but looks like a generic AI-generated page: purple/cyan gradients, glows, big rounded cards and a marketing-style tagline. This spec turns it into a professional desktop editing tool in the spirit of Photoshop: a dense, neutral dark-gray shell, a top bar, a canvas workspace in the centre and docked, collapsible panels on the right. Every setting gets a small "i" button that explains what it does. The behaviour of the foundation stays the same; this is a UI and UX change plus a few workspace conveniences (zoom, numeric fields, cursor readout).

- **Users:** game developers and technical artists generating tileable grayscale textures and heightmaps at a desk, usually alongside tools like Photoshop, Substance or a game engine, often for long stretches. They judge grayscale values by eye, so the UI around the canvas must be truly neutral (no colour cast).
- **Usage:**
  1. The user opens the app. A slim top bar shows the Noisemaker mark and name on the left and the Randomize and Reset actions. The rest of the screen is the workspace: the canvas area in the centre, and a dock on the right with the panels Presets, Noise, Fractal, Adjust and Export, each with a compact header that collapses and expands it. The last used settings are restored.
  2. Above the canvas, an options bar holds the Tile 2×2 toggle and the zoom controls: zoom out, zoom level readout, zoom in, Fit and 100%. Below the canvas, a status bar shows the render state ("Rendering…" / "Ready"), the export size and format, and, while the pointer is over the map, the pixel position in export pixels and the height value under the pointer (0–1 and 0–255).
  3. The map is shown fitted to the workspace by default and refits when the window resizes. Zooming in past the workspace size makes the canvas area scrollable. Zoom levels are relative to the export resolution (100% = one export pixel per screen pixel). Shortcuts: `+`/`=` zoom in, `-` zoom out, `0` fit, plus the existing `R` (new seed) and `T` (tile 2×2).
  4. Each setting is a compact property row: label with "i" button on the left, control on the right. Sliders have a numeric field next to them that can be typed into; the typed value is clamped to the slider's range and snapped to its step when committed (Enter or leaving the field), and an invalid entry reverts to the current value. Noise type and fractal mode are segmented button groups; Distance, Metric, Resolution and Format are selects; Seamless tiling, Invert and Auto-levels are checkboxes.
  5. The "i" button next to a setting shows a short tooltip on hover, on keyboard focus and on click/tap. Escape, moving away, or clicking elsewhere closes it. The texts explain what the setting does and how it changes the map.
  6. Presets stay at the top of the dock as a compact grid of small thumbnails with names; clicking one applies it exactly like before and highlights it.
  7. The Export panel holds Resolution, Format and (for JPG/JPEG/WebP) Quality, the Export and Copy PNG buttons and the progress bar. Export and copy behave exactly like the foundation.
  8. On a narrow window (below 760 px) the layout stacks: top bar, canvas area, then the dock full width below; the top bar buttons become icon-only with accessible names.
- **Rules:**
  - All foundation behaviour is kept: generation in the worker, cancelling stale previews, Tile 2×2, R/T shortcuts, Randomize, Reset, presets, every export format, Copy PNG, toasts, settings persistence and sanitising.
  - Every setting control (`data-key`) has a help text; an info button never appears without one.
  - The chrome around the canvas is achromatic so grayscale values read correctly; the single accent colour is used only for the primary action, selection, focus and active states.
  - Keyboard shortcuts are ignored while typing in a text or number field or a select.
- **Out of scope:** saving named maps, the Load map dialog and moving presets into it (spec 3), the start screen (spec 4), real dropdown menus (File/Edit/View), panel drag-and-drop or resizing, a light theme, CI/CD and GitHub Pages. The top bar leaves room on its left (next to the brand, for a way back to a start screen) and right (for Save and Load map) for those later specs.

# Part 2 — Technical details

## 2.1 Tools and libraries
Plain HTML, CSS and ES modules as before. No new dependencies. The Google Fonts link is removed; the UI uses the system UI font stack with tabular numerals. Icons are a small inline SVG sprite in `index.html` (16 px grid, 1.5 px stroke, round caps), referenced with `<use>`.

## 2.2 Structure

**New pure modules (no DOM, tested under Node):**
- `js/help.js`: `HELP`, a frozen object mapping every setting key (`type`, `seed`, `scale`, `tileable`, `cell`, `metric`, `jitter`, `fractal`, `octaves`, `lacunarity`, `gain`, `warp`, `contrast`, `brightness`, `steps`, `invert`, `normalize`, `tilePreview`, `size`, `format`, `quality`) to one or two short sentences.
- `js/view.js`: `ZOOM_STEPS` (0.0625 … 16), `fitZoom(viewW, viewH, imageW, imageH, pad)` (largest zoom that fits, capped at the max step, at least the min step), `zoomIn(z)` / `zoomOut(z)` (next step above/below the current zoom, also from an off-step fit zoom), `formatZoom(z)` (e.g. `"50%"`, `"12.5%"`, `"1600%"`), and `pointerToPixel(px, py, displayW, displayH, srcW, srcH)` returning the preview pixel under a pointer (with 2×2 tiling the point is wrapped into the single tile) or `null` outside.
- `js/fields.js`: `decimalsFor(step)` and `commitNumber(text, min, max, step, fallback)`: parse a typed value, return `fallback` when it isn't a finite number, otherwise clamp to `[min, max]`, snap to the step grid from `min` and round to the step's decimals. Also `formatNumber(value, step)`.

**Changed files:**
- `index.html`: rebuilt markup.
  - `<header class="topbar">`: brand (`.brand` with a small square mark and "Noisemaker"), then a toolbar with Randomize (`#randomize`) and Reset (`#reset`) icon+label buttons.
  - `<main class="workspace">` grid: `.canvas-area` (options bar `.optionsbar` with the Tile 2×2 toggle and zoom group `#zoom-out`, `#zoom-level`, `#zoom-in`, `#zoom-fit`, `#zoom-actual`; `.viewport#viewport` containing `#view`; an indeterminate render bar `#busy`; status bar `.statusbar` with `#status-state`, `#status-doc`, `#status-cursor`), and `<aside class="dock">` with panels.
  - Each panel is `<details class="panel" open>` with `<summary class="panel-head">` (name and chevron) and `.panel-body`. Panels: Presets (`#presets` grid), Noise, Fractal (keeps `data-show="type!=white"`), Adjust, Export.
  - Each property row: `<div class="prop">` with `<span class="prop-label" id="lbl-<key>" data-help="<key>">Name</span>` and the control(s) labelled with `aria-labelledby`. Sliders are followed by `<input type="number" class="num" data-num="<key>">` with the slider's min, max and step. Checkbox rows wrap the checkbox and its text in a `<label>`; the help key is on that row's text span. Segmented groups are `role="radiogroup"` labelled by their prop label.
  - `<output data-for>` elements are removed (the numeric fields replace them).
  - `#tooltip` (`role="tooltip"`, hidden) at the end of `<body>`, plus the existing `#toast`.
- `css/style.css`: rewritten. Tokens on `:root` (see 2.3 D3–D6), dark `color-scheme`, themed focus ring, selection, scrollbars, range thumbs/tracks, number fields, selects, checkboxes, segmented buttons, toolbar buttons, panel headers, tooltip, toast, render bar, responsive stacking below 760 px.
- `js/app.js`:
  - Info buttons: for every `[data-help]`, append a `<button class="info" type="button" aria-label="About <label>">` with the info icon. One shared `#tooltip` is positioned with `position: fixed` next to the button (flipping to the left/above when there's no room), shown on `pointerenter` (after a short delay) and `focus`, toggled on `click`, hidden on `pointerleave`, `blur`, Escape and outside clicks; the button gets `aria-describedby="tooltip"` while it is shown.
  - Numeric fields: `writeControls`/`syncRange` write the formatted value into the matching `.num`; on `change` the field value goes through `commitNumber` and updates state, slider and preview like a slider input; on Enter the field commits.
  - Zoom: module state `zoom` and `fitMode` (default true, not persisted). `layout()` sets `#view` CSS width/height to `size × tileFactor × zoom` in CSS pixels, toggles `.pixelated` when one preview pixel is shown larger than one CSS pixel, and updates `#zoom-level`. A `ResizeObserver` on the viewport refits while `fitMode` is on. Zoom buttons and `+`, `=`, `-`, `0` shortcuts change it; zooming keeps the viewport centre.
  - Status bar: `#status-state` shows "Rendering…" while a preview runs and "Ready" otherwise; `#status-doc` shows `<size> × <size> · <FORMAT>`; `#status-cursor` shows `X <x>  Y <y>  ·  <v 0–1> (<0–255>)` in export pixels from `pointerToPixel` and the last processed preview, and is empty when the pointer leaves.
  - `#busy` becomes the indeterminate bar toggled with the `on` class (same calls as before).
  - Everything else (regen, draw, presets, export, copy, toast, R/T shortcuts, persistence) is kept; `formatValue` is removed with the outputs.
- `tests/help.test.js`: every `data-key` in `index.html` has a non-empty `HELP` entry, every `data-help` in `index.html` exists in `HELP`, every `data-key` has a matching `data-help` label, and `HELP` has no keys that aren't settings in `DEFAULTS`.
- `tests/view.test.js`, `tests/fields.test.js`: fit, zoom stepping, formatting, pointer mapping with and without tiling; commit parsing, clamping, snapping, rounding and fallback.
- `PRODUCT.md` (new): short product truth for future design work (users, job, constraints), inferred facts labelled as such.
- `DESIGN.md` (new): the resulting design system (tokens, type scale, components, rules) so the later specs extend it instead of inventing.
- `README.md` and `CLAUDE.md`: list the new modules and the two design docs.

## 2.3 Decisions
1. Direction: a Photoshop-like professional editor (user). Dense, dark, neutral gray, docked panels, one accent. Rejected: keeping the gradient look and polishing it.
2. Help texts as data in `js/help.js`, with a test that every setting has one (user/overseer).
3. Ground and chrome are achromatic grays (no blue or warm tint), because users judge grayscale maps by eye and a tinted surround shifts perceived values.
4. Palette tokens: app ground `#1b1b1b`, workspace pasteboard `#222222`, panels `#2b2b2b`, panel headers and bars `#252525`, raised controls `#363636` (hover `#404040`), field wells `#1c1c1c`, borders `#3a3a3a` / strong `#4a4a4a`, text `#e3e3e3`, secondary text `#a6a6a6`, tertiary `#8a8a8a` (only for 11 px+ meta on dark panels, ≥4.5:1), accent `#3b8ced` (Photoshop-like blue), accent hover `#5aa0f2`, accent text on accent `#ffffff`, error `#e5534b`.
5. Type: system UI stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), 12 px base for property rows, 11 px for panel headers (semibold, not uppercase) and status bar, 13 px for the brand; `font-variant-numeric: tabular-nums` on numeric fields and readouts. No Google Fonts.
6. Shape and depth: radius 3 px on controls, 2 px on segmented buttons, 0 on panels; elevation by 1 px borders only, a soft shadow only on the canvas, tooltip and toast.
7. Panels are `<details>`/`<summary>` for native accessible collapsing. Collapsed state is not persisted (later specs may add it).
8. Zoom is relative to the export resolution (100% = one export pixel per screen pixel), matching how Photoshop reports document zoom; the preview stays capped at 512 px, so above that size zooming in shows the preview upscaled.
9. Number fields commit on change/Enter, not on every keystroke, so partially typed values like `0.` or `-` aren't clamped mid-typing.
10. The tooltip is one shared, fixed-position element so it escapes the scrolling dock and never clips.
11. The info icon is a drawn SVG, not an "i" character or emoji.

## Assumptions
Recorded because this sub-session runs autonomously without stopping for approval.
- A1. Randomize and Reset stay in the top bar; New seed stays as the dice button in the Seed row. Export and Copy PNG live in the Export panel only, not duplicated in the top bar.
- A2. No File/Edit/View dropdown menus; a toolbar is enough for the current actions and avoids a non-functional menu. Later specs can add Save and Load map to the top bar's right side.
- A3. Cursor readout and zoom are added as cheap workspace conveniences; the readout shows the export-pixel coordinate (preview pixel × size / preview resolution) and the preview's processed value at that pixel.
- A4. Zoom shortcuts `+`/`=`, `-` and `0`, following the existing single-key shortcut style (R, T). Fit is the default on load and after Fit; any other zoom action leaves fit mode.
- A5. Canvas uses `image-rendering: pixelated` when one preview pixel covers more than one CSS pixel, so zooming in shows actual pixels rather than blur.
- A6. The render indicator becomes a thin indeterminate bar at the top of the canvas area plus the "Rendering…" status text, instead of a spinner over the image.
- A7. Preset thumbnails stay 72 px canvases drawn at a smaller display size in a 5-column grid with names below; the highlight is an accent outline.
- A8. Narrow layout below 760 px stacks the canvas area (55vh tall) above the dock; the page scrolls instead of the dock.
- A9. The impeccable skill's interview and concept-roll steps are replaced by the brief, which pins the direction (Photoshop-like, neutral dark, single accent); the build is code-led with no generated comps. `PRODUCT.md` is written from the README, the specs and the brief, with inferred facts labelled.
- A10. Help text tone: plain, second person, at most two sentences, says what the setting does and what higher/lower values look like.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: 33 tests passing.

### A. Pure logic
- [ ] A1. `js/help.js` with `HELP` texts for every setting key; `tests/help.test.js` checks coverage against `index.html` (after B1) and `DEFAULTS`.
- [ ] A2. `js/view.js` with `ZOOM_STEPS`, `fitZoom`, `zoomIn`, `zoomOut`, `formatZoom`, `pointerToPixel`; tests in `tests/view.test.js`.
- [ ] A3. `js/fields.js` with `decimalsFor`, `commitNumber`, `formatNumber`; tests in `tests/fields.test.js`.

### B. Editor shell
- [ ] B1. Rewrite `index.html` with the top bar, workspace, options bar, viewport, status bar, dock panels, property rows, numeric fields, icon sprite and tooltip; drop the Google Fonts links and replace the favicon with a neutral one.
- [ ] B2. Rewrite `css/style.css` with the tokens and components in 2.3, including focus, hover, active, disabled, selection, scrollbars and the narrow layout.
- [ ] B3. Update `js/app.js`: info buttons and tooltip, numeric fields, zoom and fit with ResizeObserver, status bar and cursor readout, render bar; remove `formatValue` and outputs.

### C. Design review
- [ ] C1. Verify in the browser at desktop (1440×900) and narrow (390 wide) widths: every panel, every type's conditional rows, tooltips by hover/focus/click, numeric commits, zoom, tile, presets, export and copy, no console errors.
- [ ] C2. Run the impeccable detector on the changed files, then a critique/polish pass (fresh finish review) and fix what holds.

### D. Docs
- [ ] D1. `PRODUCT.md` and `DESIGN.md` at the repository root.
- [ ] D2. Update `README.md` and `CLAUDE.md` for the new modules and docs.

### Z. Wrap-up
- [ ] Z1. `npm test` passes.
- [ ] Z2. Manual check in the browser via `python3 -m http.server 5173`: generation for each type, presets, Tile 2×2, zoom, R/T, Randomize, Reset, export in every format, Copy PNG, reload restores settings, no console errors.
