# App foundation — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-19

# Part 1 — Business logic and usage

Noisemaker so far only exists as a single-page prototype in `prototype/`. This spec builds the real app at the repository root, using the prototype as the behaviour reference, split into native ES modules with the pure logic testable under Node. It also applies the first round of product changes the user asked for, and adds a README and a test suite. Later specs (editor redesign, saving and loading maps, start screen) build on this foundation, so the code is laid out to make them easy: map settings are one plain serialisable object and presets are plain data.

- **Users:** game developers and technical artists who need tileable grayscale noise textures and heightmaps, working in a desktop browser.
- **Usage:**
  1. The user opens the app. The panel on the left shows Presets, Noise, Fractal and Adjust groups; the stage on the right shows the preview and the export bar. The last used settings are restored from the browser.
  2. Changing any setting regenerates the preview (up to 512 × 512) in a Web Worker; a busy indicator shows while it runs. A newer change cancels a running preview.
  3. Presets show small thumbnails; clicking one applies it (keeping seed, export resolution, format, quality and tile preview) and highlights it until another setting is changed.
  4. Noise types are Perlin, Value, Worley and White. Seamless tiling is a toggle (hidden for White, which always tiles). Worley shows Distance, Metric and Jitter.
  5. Fractal (None, fBm, Ridged, Billow) with Octaves, Lacunarity and Gain, plus Domain warp; hidden for White.
  6. Adjust: Contrast (0 to 3), Brightness, Posterize, Invert, Auto-levels. Contrast 0 gives a flat mid-gray map.
  7. The "Tile 2×2" toggle above the preview (or the `T` key) shows the map repeated 2 × 2 to check seams. `R` picks a new seed.
  8. "Randomize" in the top bar picks random settings; "Reset" restores the defaults.
  9. Export: choose resolution (128 to 4096) and format (PNG, JPG, JPEG, WebP, BMP 24-bit, TGA 32-bit, RAW16 .r16); Quality is shown for JPG, JPEG and WebP. "Export" downloads the file with a progress bar; "Copy PNG" copies it to the clipboard. A toast reports the result, an unsupported clipboard, a WebP fallback to PNG, or an error.
- **Rules:**
  - Every offered setting tiles seamlessly when Seamless tiling is on: the right edge continues into the left edge and the bottom into the top, including with fractal layering and domain warp. Simplex noise is removed because it can't tile.
  - Output is grayscale only, black to white.
  - Settings restored from the browser are sanitised: unknown values (for example the removed `simplex` type) fall back to the defaults.
- **Out of scope:** the professional editor redesign and info tooltips, saving maps and the Load map dialog (presets stay in the panel for now), the start screen, enabling GitHub Pages. Each has its own later spec. No CI/CD pipeline (no GitHub Actions workflows) and no GitHub Pages setup or Pages deploy workflow; the overseer sets up Pages once every spec is finished.

# Part 2 — Technical details

## 2.1 Tools and libraries
Plain HTML, CSS and JavaScript with native ES modules, no framework, bundler or build step, no runtime dependencies. The noise worker is a module worker (`new Worker(url, { type: 'module' })`). Tests use Node's built-in test runner. `package.json` has no dependencies. No new dependencies. The Google Fonts link from the prototype stays.

## 2.2 Structure
New files at the repository root (the prototype is never edited):

- `index.html`: the prototype's markup with the changes below; loads `js/app.js` as `type="module"`.
- `css/style.css`: the prototype's styles minus the `.chips` / `.chip` rules; `.stage-bar` keeps the Tile 2×2 toggle right-aligned.
- Pure modules (no DOM, importable from Node):
  - `js/noise.js`: hash, Perlin, Value and Worley base noises, fractal layering, `createSampler(params)` returning `(u, v) => n` in -1..1 over the unit tile, and `generate(w, h, params, onProgress)` returning a `Float32Array` in 0..1 (auto-levels or clamp).
  - `js/postprocess.js`: `postProcess(data, w, h, adjust)` returning `{ rgba, height }`.
  - `js/encoders.js`: `encodeBMP(rgba, w, h)`, `encodeTGA(rgba, w, h)`, `encodeR16(height)` returning `Uint8Array`s, and `mimeFor(format)`.
  - `js/settings.js`: `DEFAULTS`, `NOISE_KEYS`, `OPTIONS` (allowed values per enum key), `sanitize(state)`, `noiseParams(state)` and `randomize(random)`.
  - `js/presets.js`: `PRESETS` as data (`{ name, settings }`).
  - `js/storage.js`: `loadSettings(storage)` and `saveSettings(storage, settings)` under the key `noisemaker:settings:v1`, tolerant of missing or broken storage.
- Browser modules:
  - `js/worker.js`: module worker; receives `{ id, w, h, p }`, posts progress and the result buffer.
  - `js/worker-client.js`: `runWorker(worker, id, w, h, p, onProgress)` and `createNoiseWorker()`.
  - `js/exporter.js`: canvas blob encoding, `encode(format, out, size, quality)`, `download(blob, name)`.
  - `js/app.js`: UI wiring (controls, visibility rules, preview, presets, randomize, reset, export, copy, toast, shortcuts).
- `package.json`: `"type": "module"`, `"test": "node --test"`, no dependencies.
- `tests/`: `noise.test.js`, `postprocess.test.js`, `encoders.test.js`, `settings.test.js`, `storage.test.js`.
- `README.md` (via the `create-readme` skill); `CLAUDE.md` layout section updated if it differs.

Changes vs the prototype:
- Contrast slider `min="0"`.
- Simplex removed from the type selector, the noise engine, the warp base and Randomize; the Simplex note removed.
- "Surprise me" button becomes "Randomize" (`id="randomize"`).
- The stage bar chips row (preview size, export size, ms, seamless) and `updateChips` removed; Tile 2×2 stays.

## 2.3 Decisions
1. Contrast range 0 to 3 (user). Pros need full control; 0 yields flat mid-gray plus brightness.
2. Simplex removed entirely (user: non-tiling options aren't offered). Rejected: keeping it with tiling disabled.
3. Button renamed to "Randomize" (user).
4. Stage chips removed; Tile 2×2 kept (user).
5. Visual design and presets kept as in the prototype for now (overseer); a later spec redesigns.
6. Settings persistence: the last used settings keep being restored from `localStorage`, like the prototype. Saving named maps is a later spec.
7. Tests are run locally with `npm test` before every push; there is no CI/CD pipeline and no GitHub Actions workflow (user, 2026-11-19).
8. GitHub Pages and any Pages deploy workflow are not set up in this spec; the overseer does that once every spec is finished (user, 2026-11-19).

## Assumptions
Recorded because this sub-session runs autonomously without stopping for approval.
- A1. The localStorage key changes from the prototype's `noisemaker:state:v2` to `noisemaker:settings:v1`; prototype state is not migrated.
- A2. Restored settings are sanitised per key: an enum value not in `OPTIONS`, a non-finite number, or a wrong-typed boolean falls back to the default; numbers are clamped to the slider range.
- A3. Encoders return `Uint8Array` so they're testable without Blob; the browser wraps them in a Blob.
- A4. The worker becomes a module worker; all target browsers (current Chrome, Firefox, Safari) support it.
- A5. Randomize keeps the prototype's weighting with Simplex dropped (Perlin, Perlin, Value, Worley, Worley).
- A6. The `tileable` toggle still exists; with it off, maps don't tile, which is the user's explicit choice and not a non-tiling option.
- A7. Noise output must match the prototype for the remaining noise types (same hash and maths), so existing presets look the same.
- A8. Export file name stays `noisemaker_<preset or type>_<seed>_<size>.<ext>`.
- A9. Auto-levels takes its min and max from the stored 32-bit values, so output is exactly within 0..1. The prototype took them from 64-bit values, which could produce tiny negatives.
- A10. Randomize clears the active preset highlight, like Reset (the prototype left it on).
- A11. The project `CLAUDE.md` already describes the real layout, so it is left unchanged.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: no tests, no app at the root.

### A. Pure logic
- [x] A1. `package.json` with `"type": "module"` and `"test": "node --test"`.
- [x] A2. `js/noise.js` ported from `prototype/js/worker.js` without Simplex, exposing `createSampler` and `generate`. Tests in `tests/noise.test.js`: determinism per seed, different seeds differ, output in 0..1, seamless edges (sampler at u=0 vs u=1 and v=0 vs v=1) for Perlin, Value, Worley with fBm, ridged, billow and warp, White tiles.
- [x] A3. `js/postprocess.js` with tests: contrast 0 gives 128 gray, invert, posterize levels, brightness clamps.
- [x] A4. `js/encoders.js` with tests: BMP header fields, row padding and file size; TGA header and size; R16 little-endian values and size.
- [x] A5. `js/settings.js`, `js/presets.js`, `js/storage.js` with tests: sanitize drops `simplex` and clamps, randomize only yields allowed values, presets sanitise to themselves, storage round-trip and broken storage.

### B. Browser app
- [x] B1. `js/worker.js`, `js/worker-client.js`, `js/exporter.js`.
- [x] B2. `index.html` and `css/style.css` from the prototype with the changes in 2.2.
- [x] B3. `js/app.js` UI wiring using the modules above.

### C. Docs
- [x] C1. `README.md` via `create-readme`.
- [x] C2. Update `CLAUDE.md` if the layout differs.

### Z. Wrap-up
- [x] Z1. `npm test` passes.
- [x] Z2. Manual check in the browser via `python3 -m http.server 5173`: generation for each type, presets, Tile 2×2, Randomize, Reset, contrast 0, export in every format, no console errors.
