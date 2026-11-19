# Noisemaker

Noisemaker is a browser app for generating seamlessly tileable grayscale noise maps (Perlin, Value, Worley and White noise, with fractal layering and domain warp) for game development. Maps export as PNG, JPG, JPEG, WebP, BMP, TGA or RAW16 (`.r16`) heightmaps. Everything runs in the browser; nothing is uploaded.

## Tech stack

- **Frontend:** plain HTML, CSS and JavaScript with native ES modules. No framework, bundler or build step, no runtime dependencies.
- **Noise generation:** runs in a Web Worker so the UI stays responsive.
- **Storage:** the last used settings are kept in the browser's `localStorage`.
- **Tests:** Node's built-in test runner, no test dependencies.
- **Hosting:** a static site that can be served from the repository root, e.g. by GitHub Pages.

## Project structure

- `index.html`, `css/`, `js/`: the app, served as-is from the repository root.
- `js/noise.js`, `js/postprocess.js`, `js/encoders.js`, `js/settings.js`, `js/presets.js`, `js/storage.js`, `js/help.js`, `js/view.js`, `js/fields.js`: pure logic and data with no DOM access (noise, image adjustments, file encoders, settings, presets, storage, setting help texts, zoom maths, numeric field parsing), tested under Node.
- `js/worker.js`, `js/worker-client.js`, `js/exporter.js`, `js/app.js`: the Web Worker, file export and UI wiring.
- `tests/`: Node tests for the pure logic.
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
