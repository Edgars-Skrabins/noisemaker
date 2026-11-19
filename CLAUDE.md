# CLAUDE.md

## Project
Noisemaker is a browser app for generating procedural, seamlessly tileable grayscale noise maps (Perlin, Value, Worley, White, with fractal layering and domain warp) and exporting them as PNG, JPG/JPEG, WebP, BMP, TGA or RAW16 heightmaps for game development and similar work. It is a static site meant to be hosted on GitHub Pages: no backend, all data stays in the browser.

## Stack
- Plain HTML, CSS and JavaScript using native ES modules. No framework, no bundler, no build step, no runtime dependencies.
- Noise generation runs in a Web Worker so the UI stays responsive.
- Saved user data lives in `localStorage`: the last used settings (`js/storage.js`), the saved maps and the map being edited (`js/maps.js`).
- Tests use Node's built-in test runner (`node --test`), with no test dependencies.

## Layout
- `index.html`, `css/`, `js/`: the app, served as-is from the repository root.
- `tests/`: Node tests for the pure, DOM-free modules in `js/`, plus checks that `index.html` matches the settings definitions.
- `prototype/`: the original single-page prototype. Reference only, never edited and not part of the app.
- `specs/`: feature and bug-fix specs.
- `PRODUCT.md` and `DESIGN.md`: product context and the design system. New UI reuses the `DESIGN.md` tokens and components.

Keep pure logic (noise math, image post-processing, file encoders, storage) in modules with no DOM access so it can be tested under Node. UI modules wire that logic to the DOM. Presets (`js/presets.js`) are read-only templates offered in the New map dialog (after "Blank") and the Load map dialog; `js/library.js` builds the saved-map and template lists for the start screen and the dialogs.

The app is one page with two screens, the start screen and the editor, switched by `data-screen` on `<html>` in `js/app.js`. The editor is reflected in the URL as `#editor` (set with `history.replaceState`, so there are no history entries per screen); the plain URL opens the start screen. Keep all paths relative so the site works from any folder, e.g. GitHub Pages.

## Commands
- Run locally: `python3 -m http.server 5173` from the repository root, then open http://localhost:5173. Workers and ES modules don't load from `file://`.
- Test: `npm test` (runs `node --test`).

## Conventions
- No comments in code.
- Every setting must work with seamless tiling; options that can't tile are not offered.
- Output maps are grayscale only (black to white).
- Every setting control (`data-key`) has a label with `data-help` and a help text in `js/help.js`; `tests/help.test.js` enforces it.

## Specs
- Specs live in `specs/shared/` (committed). `specs/personal/` (gitignored) is only used when asked.
- Read a feature's spec before implementing it.
- Specs with **Status** `done` stay as the record of finished work; where a spec and the code disagree, the code wins.
