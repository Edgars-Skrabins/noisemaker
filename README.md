# Noisemaker

Noisemaker is a browser app for generating seamlessly tileable grayscale noise maps (Perlin, Value, Worley and White noise, with fractal layering and domain warp) for game development. The app opens on a start screen listing your saved maps, where a new map starts blank or from a template. Maps are saved in the browser and export as PNG, JPG, JPEG, WebP, BMP, TGA or RAW16 (`.r16`) heightmaps. Everything runs in the browser; nothing is uploaded.

Live app: https://edgars-skrabins.github.io/noisemaker/

## Tech stack

- **Frontend:** plain HTML, CSS and JavaScript with native ES modules. No framework, bundler or build step, no runtime dependencies.
- **Noise generation:** runs in a Web Worker so the UI stays responsive.
- **Storage:** saved maps (named, with thumbnails) and the map being edited are kept in the browser's `localStorage`.
- **Tests:** Node's built-in test runner, no test dependencies.
- **Hosting:** GitHub Pages serves the repository root of `main`; every merge to `main` goes live. There is no CI.

## Project structure

- `index.html`, `css/`, `js/`: the app, served as-is from the repository root.
- `js/noise.js`, `js/postprocess.js`, `js/encoders.js`, `js/settings.js`, `js/presets.js`, `js/storage.js`, `js/maps.js`, `js/help.js`, `js/view.js`, `js/fields.js`, `js/visibility.js`: pure logic and data with no DOM access (noise, image adjustments, file encoders, settings, templates, last-used settings, the saved-maps store, setting help texts, zoom maths, numeric field parsing, the rules that show or hide settings), tested under Node.
- `js/boot.js`, `js/worker.js`, `js/worker-client.js`, `js/exporter.js`, `js/dialogs.js`, `js/tooltip.js`, `js/library.js`, `js/app.js`: picking the first screen before paint, the Web Worker, file export, modal dialogs, setting tooltips, the saved-map and template lists, and UI wiring.
- `tests/`: Node tests for the pure logic and for `index.html` matching the settings.
- `PRODUCT.md`, `DESIGN.md`: product context and the editor's design system (colours, type, components) for future UI work.
- `specs/`: feature and bug-fix specs.
- `prototype/`: the original single-page prototype, kept for reference only.

## Prerequisites

- Python 3, to serve the app locally (any static file server works).
- Node.js 18 or newer, to run the tests. No version is pinned.
- A current desktop browser with module Web Worker support (Chrome, Edge, Firefox or Safari).

## Setup

There is nothing to install. Clone the repository and you're ready.

## Running the app

1. From the repository root, start a static server:
   ```bash
   python3 -m http.server 5173
   ```
2. Open http://localhost:5173.

The app must be served over HTTP: ES modules and Web Workers don't load from `file://`.

## Running tests

From the repository root:

```bash
npm test
```
