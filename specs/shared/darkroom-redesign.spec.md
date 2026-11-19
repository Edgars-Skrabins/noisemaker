# Darkroom redesign — Spec

**Type:** feature
**Status:** done
**Last updated:** 2026-11-19

# Part 1 — Business logic and usage

The user finds the current Photoshop-style UI ugly. After reviewing six concepts they chose "Darkroom": a warm charcoal editor with an amber accent, settings as numbered steps in a left sidebar, the preview shown like a photo print on a cream mat, and a contact sheet of alternative seeds under it. This spec replaces the visual world of the start screen, the editor and the dialogs with Darkroom and makes it work well on desktop, tablet and phone. Every existing feature and behaviour stays; the only new feature is the contact sheet.

- **Users:** game developers and technical artists dialling in tileable grayscale maps, mostly at a desk, sometimes on a tablet or phone to browse saved maps or try seeds.
- **Usage (editor, desktop ≥ 1100 px):**
  1. A left sidebar (360 px) holds, top to bottom:
     - A head: the brand mark and "NOISEMAKER" in mono caps on the left; on the right a "My maps" button (grid icon) that returns to the start screen exactly like the old brand button (same unsaved-changes prompt, `#home`). Under it the map name as a 22 px heading, followed by the unsaved-changes dot and the "Not saved" note as today.
     - The settings as numbered steps, separated by thin rules: **01 Pattern** (Type, Seed, Scale, Seamless tiling, and for Worley Distance, Metric, Jitter), **02 Detail** (Fractal mode, Octaves, Lacunarity, Gain, Warp; hidden for White noise as the Fractal panel is today), **03 Tone** (Contrast, Brightness, Posterize, Invert, Auto-levels), **04 Export** (Resolution, Format, Quality for JPG/JPEG/WebP, and "Copy PNG"). Numbers are counted in CSS, so when Detail is hidden the steps read 01 Pattern, 02 Tone, 03 Export.
     - Each step is a disclosure. A collapsed step shows its number, its name and a one-line summary of its current values on the right (e.g. "Perlin · scale 4", "fBm · 5 octaves · warp 0.4", "Auto-levels · contrast 1.2", "1024 px · PNG"). Opening a step closes the others (one active step); clicking the open step closes it. Pattern is open when the editor loads. If the open step gets hidden (Detail when the type becomes White), it closes and Pattern opens. The open step's number is amber.
     - A footer: "Load map" (opens the Load map dialog), "Save" (Save dialog, Ctrl/Cmd+S) and a primary amber "Export" button. The export progress bar sits above these buttons.
  2. The main area (the stage), on the deep well colour:
     - A toolbar: Randomize and Reset on the left; Tile 2×2, zoom out, zoom level, zoom in, Fit and 100% on the right.
     - The preview printed on a cream mat: cream padding around the map with a thicker bottom edge. Fit, zoom, scroll, pixelated zoom, the busy sweep and Tile 2×2 work as today; fitting accounts for the mat.
     - A status line: render state, export size and format, and the cursor readout (X, Y, value 0–1 and 0–255).
     - The **contact sheet**: a mono label "Contact sheet", four frames showing the current settings with four seeds, each with its seed number under it, and a "Shuffle" button. The frame holding the current seed is outlined in amber and marked pressed. Clicking another frame adopts its seed (same as typing it into Seed). Shuffle replaces the three other frames with new random seeds and keeps the current one in place. When the seed changes elsewhere (dice, R, typing, Randomize, Reset, loading a map) and the new seed is not on the sheet, it replaces the first frame. The frames re-render whenever a setting that affects the image changes (always one tile, never 2×2), after the main preview has rendered; tone-only changes re-use the rendered frames. Frames are not stored; reloading makes three fresh seeds.
- **Usage (tablet, 760–1099 px):** the same two-column layout with a 320 px sidebar. The stage toolbar hides button labels where space is tight, keeping icons and titles.
- **Usage (phone, < 760 px):** one scrolling column: the sidebar head, then the stage (toolbar, the print at up to the screen width and 60 % of the screen height, status line without the cursor readout, contact sheet with four frames in a row), then the steps, then a footer with Load map, Save and Export that sticks to the bottom of the screen.
- **Touch (`pointer: coarse`, any width):** controls get at least 44 px hit areas (step headers, buttons, segments, checkboxes, slider thumbs), inputs use 16 px text so iOS doesn't zoom on focus, and the map-card delete button is always visible (as today).
- **Start screen:** same content and behaviour (heading "Your maps", count, "New map", the saved-map grid, the empty state, the New map dialog). It gets its own brand row ("NOISEMAKER" in mono caps), the 22 px heading, the count in mono, and map cards whose thumbnails sit on a cream mat like small prints. The grid has a 16 px gutter on phones.
- **Dialogs:** Save, Load map (Saved maps / Templates tabs), New map and the confirmation dialog keep their content and behaviour and take the Darkroom tokens.
- **Kept as they are:** saved maps, save / overwrite / save-as-new, Load map, templates, tooltips with an info button per setting (now opening to the right of the sidebar on wide screens), zoom, Tile 2×2, keyboard shortcuts (R, T, +, −, 0, Ctrl/Cmd+S), screens in the URL hash, focus moves after switching screens, tab titles, all toasts and error texts, the CSP.
- **Rules:**
  - Output stays grayscale only; the colours are chrome only. Every setting still tiles seamlessly; the contact sheet renders with the same settings, so it tiles too.
  - The contact sheet never changes any setting except the seed, and only when a frame is clicked.
  - Leaving the editor or loading a map doesn't touch the sheet beyond the seed rule above.
- **Out of scope:** a light theme; remembering which step is open; storing contact-sheet seeds; new settings; changes to file formats or rendering.

# Part 2 — Technical details

## 2.1 Tools and libraries
Plain HTML, CSS and ES modules as today. New self-hosted fonts in `fonts/`: IBM Plex Sans 400/500/600 (Latin1 and Latin2 subsets) and IBM Plex Mono 400 (Latin1 and Pi) and 500 (Latin1), woff2 from `@ibm/plex-sans@1.1.0` and `@ibm/plex-mono@1.1.0`, with `fonts/LICENSE.txt` (SIL OFL 1.1). No runtime dependencies, no build step. The CSP stays `default-src 'self'` (which covers fonts).

## 2.2 Structure

**New pure modules**
- `js/summary.js`: `stepSummary(step, settings)` for `pattern`, `detail`, `tone`, `export`, returning the one-line summary:
  - pattern: type label (Perlin, Value, Worley, White); for Worley the distance label (F1, F2, F2 − F1, Cell ID); then `scale <n>` unless White; then `no tiling` when `tileable` is false and not White. Joined with " · ".
  - detail: `No fractal` for fractal none, else the mode label (fBm, Ridged, Billow) and `<n> octaves` (`1 octave`); then `warp <n>` when warp > 0.
  - tone: `Auto-levels` when normalize; `contrast <n>` when ≠ 1; `brightness ±<n>` when ≠ 0; `<n> levels` when steps > 1; `Inverted` when invert. `Unchanged` when none apply.
  - export: `<size> px · <format label>`, plus ` <q>%` for JPG/JPEG/WebP.
  Numbers formatted with `formatNumber` using the slider steps (0.5 scale, 0.05 warp/contrast, 0.01 brightness).
- `js/sheet.js`: `SHEET_FRAMES = 4`; `makeSheet(seed, random)` → `[seed, …3 new unique seeds]`; `syncSheet(seeds, seed)` → same array when it includes `seed`, else a copy with `seed` in slot 0; `shuffleSheet(seeds, seed, random)` → `seed` kept in its slot (slot 0 if absent), the others new seeds unique and different from `seed`. Seeds come from `newSeed(random)`.

**`index.html`**
- The top bar goes. `<main class="workspace">` holds, in DOM order: `header.side-head` (brand, `#home` "My maps", `.doc` with `#doc-name`, `#doc-dirty`, `#doc-note`), `aside.steps` (`aria-label="Settings"`) with four `details.step[name="steps"]`, each `summary.step-head` holding `.step-num` (aria-hidden), `.step-title`, `.step-sum[data-sum="<step>"]` and the chevron, then `.step-body` with the existing `.prop` rows unchanged; `footer.side-foot` (`#progress`, `#load-map`, `#save-map`, `#download`); `section.stage` (`.stage-bar` with `#randomize`, `#reset`, the Tile 2×2 toggle and the zoom group; `#busy`; `#viewport` > `.print` > `#view`; `.statusbar`; `.sheet` with the label, `#sheet-list` and `#shuffle`). `#copy` moves into the Export step.
- The start screen gets a `.start-brand` row. New icon `i-grid` for "My maps".
- `<link rel="preload">` for the two most used fonts (Sans 400 Latin1, Mono 400 Latin1) with `crossorigin`. Favicon and `theme-color` move to the Darkroom palette.

**`css/style.css`** rewritten on Darkroom tokens: `--ground #1A1714`, `--panel #24201C`, `--line #3A332C`, `--well #110F0D`, `--text #EFE7DC`, `--text-2 #B3A797`, `--accent #E8A24A`, `--on-accent #221608`, `--selected #3A2C1A`, `--mat #EFE7DC`, plus derived raised / hover / text-3 / error steps, 4 px radius, Plex Sans 13 px UI and Plex Mono for numbers, step numbers and uppercase micro-labels. Grid areas on wide screens (`side-head`, `steps`, `side-foot` in column 1, `stage` spanning column 2), single column below 760 px with the footer `position: sticky; bottom: 0`. Step numbers via a CSS counter on `.step:not([hidden])`. `@media (pointer: coarse)` raises hit areas and input font size. Reduced motion respected.

**`js/app.js`**
- Summaries: `updateSummaries()` writes `stepSummary` into each `[data-sum]`, called from `writeControls()` and `onChange()`.
- Layout: `layout()` subtracts the mat (`.print` size minus canvas size) and the viewport's computed padding before `fitZoom`; `VIEW_PAD` goes.
- Contact sheet: `sheetSeeds` state from `makeSheet(state.seed)`; `renderSheet()` builds four `button.frame` (canvas + mono seed, `aria-pressed`, `aria-label="Use seed <n>"`) when the seeds change; `scheduleSheet()` after a noise change renders each frame through one dedicated worker at `SHEET_SIZE = 160`, keeping the raw data per frame; a new change terminates the running sheet worker; tone-only changes re-run `postProcess` on the kept data. It runs after the main preview finishes (`regen` calls it) and only on the editor screen. Clicking a frame: `setState({ seed })`. `#shuffle`: `shuffleSheet`, rebuild, render. Seed changes run `syncSheet`.
- `#home` is no longer disabled by `showScreen` (it isn't on the start screen).

**`js/tooltip.js`**: `placeTip` places the tip to the right of the `.steps` sidebar when the button is inside it and it fits; otherwise the current fallbacks. `setupHelp` scrollers become `[$('.steps')]`.

**Tests**
- `tests/summary.test.js`: each step's summary for defaults, Worley, White, no tiling, no fractal, singular octave, warp, tone combinations and `Unchanged`, lossy and lossless export.
- `tests/sheet.test.js`: `makeSheet` length and uniqueness and current seed first; `syncSheet` keeps or replaces slot 0; `shuffleSheet` keeps the current seed's slot and gives new unique seeds.
- `tests/html.test.js`: every step has a `data-sum` with a known step name and the steps are Pattern, Detail, Tone, Export in order; every `url(...)` in `css/style.css` and every preloaded font exists on disk; no remote URLs in the CSS.

**Docs**: `DESIGN.md` replaced with the Darkroom system; `PRODUCT.md` brand commitments and platform line updated; `README.md` and `CLAUDE.md` updated for `fonts/`, the new modules and the layout.

## 2.3 Decisions
1. Visual direction: Darkroom, chosen by the user from six concepts; palette, type, sidebar steps, print mat and contact sheet as briefed.
2. Fonts are self-hosted (latin subsets of IBM Plex, OFL) instead of extending the CSP for Google Fonts: keeps the strict CSP, works offline and sends no visitor data to a third party. Latin2 is included for Sans so accented map names (e.g. Latvian) render in Plex.
3. One open step at a time via `<details name>` (exclusive accordion); browsers without it simply allow several open steps. Rejected: custom JS accordion (more code, same result).
4. Step numbers come from a CSS counter so hiding Detail for White noise renumbers the steps instead of leaving a gap.
5. "My maps" in the sidebar head is the home button; the brand itself is a plain label. Load map moves to the footer next to Save and Export; Randomize and Reset move to the stage toolbar; Copy PNG moves into the Export step so the footer has a single primary Export.
6. The status bar stays as a line under the print (not printed on the mat), so the readout stays visible when zoomed in and the mat stays clean.
7. Contact sheet: four frames including the current seed; seeds aren't stored; frames render at 160 px after the main preview so they never slow it down.
8. The chrome is deliberately warm (the user's choice); the map itself stays grayscale and the cream mat gives a light neutral frame to judge values against. DESIGN.md records this instead of the old "achromatic chrome" rule.
9. The spec was written and implemented without an approval round, as the user asked for autonomous work with safe assumptions.
10. (2026-11-19, during implementation) On phones the stage toolbar is a two-row grid: Randomize, Reset and Tile 2×2 on top, the zoom controls spread across the second row. With 44 px touch targets one row doesn't fit 375 px, and hiding "100%" would drop a feature.
11. (2026-11-19, during implementation) Dialogs lose their border and keep only the shadow, and micro-labels are 11 px, following the impeccable detector (no border-plus-wide-shadow, no functional text below 11 px). The busy sweep stays as the one looping animation because it marks rendering.
12. (2026-11-19, code review) The contact-sheet worker is cancelled whenever the main preview is scheduled or starts, and the sheet never renders while the preview is busy. For White noise the sheet's cache key includes the resolution, because White sampling depends on it. Coarse-pointer tools get a 44 px minimum width instead of a fixed icon-only width at ≥ 1100 px. All touch targets reach 44 px; info buttons do it with an invisible hit area. `text-3` becomes `#998D7F` for ≥ 4.5:1 step numbers. The unused `--mat-ink` token is removed.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: 85 tests, all passing.

### A. Pure modules
- [x] A1. Add `js/summary.js` and `tests/summary.test.js`.
- [x] A2. Add `js/sheet.js` and `tests/sheet.test.js`.

### B. Fonts and markup
- [x] B1. Add the woff2 files and `fonts/LICENSE.txt` in `fonts/`.
- [x] B2. Restructure `index.html` (side head, steps, footer, stage with print and contact sheet, start brand, icons, preloads, favicon, theme colour).
- [x] B3. Update `tests/html.test.js` for the steps and font files.

### C. Styles
- [x] C1. Rewrite `css/style.css` on the Darkroom tokens for the editor, start screen, dialogs, tooltip and toast.
- [x] C2. Responsive and touch: tablet, phone single column with sticky footer, `pointer: coarse` targets, reduced motion.

### D. Behaviour
- [x] D1. `js/app.js`: summaries, mat-aware fit, `#home` handling.
- [x] D2. `js/app.js`: contact sheet rendering, frame clicks, Shuffle, seed sync.
- [x] D3. `js/tooltip.js`: placement beside the sidebar and the scroller.

### E. Docs
- [x] E1. Replace `DESIGN.md`; update `PRODUCT.md`, `README.md`, `CLAUDE.md`.

### Z. Wrap-up
- [x] Z1. `npm test`.
- [x] Z2. Manual check in the running app at desktop, tablet and phone widths: start screen, New map from a template, change settings in each step and watch the summaries, adopt a contact-sheet seed, Shuffle, Tile 2×2, zoom, tooltip, Save, Load map, Export, back to My maps with the unsaved prompt; no console or CSP errors.
- [x] Z3. Run the impeccable detector over the changed UI files and fix what holds.
