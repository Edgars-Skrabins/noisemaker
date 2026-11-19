# Noisemaker

Noisemaker is a browser app for generating seamlessly tileable grayscale noise maps (Perlin, Value, Worley and White noise, with fractal layering and domain warp) for game development. The app opens on a start screen listing your saved maps, where a new map starts blank or from a template. The editor shows the settings as numbered steps in a sidebar, the preview as a print on a cream mat, and a contact sheet of other seeds to pick from. Maps are saved in the browser and export as PNG, JPG, JPEG, WebP, BMP, TGA or RAW16 (`.r16`) heightmaps. Everything runs in the browser; nothing is uploaded.

Live app: https://edgars-skrabins.github.io/noisemaker/

## Tech stack

- **Frontend:** plain HTML, CSS and JavaScript with native ES modules. No framework, bundler or build step, no runtime dependencies.
- **Noise generation:** runs in a Web Worker so the UI stays responsive.
- **Storage:** saved maps (named, with thumbnails) and the map being edited are kept in the browser's `localStorage`.
- **Dev server and tests:** Node, using only its built-in modules: a small static server (`scripts/serve.js`) and the built-in test runner. No dependencies.
- **Hosting:** GitHub Pages serves the repository root of `main`; every merge to `main` goes live. There is no CI.

## Project structure

- `index.html`, `css/`, `js/`, `fonts/`: the app, served as-is from the repository root. `fonts/` holds the self-hosted IBM Plex woff2 files and their licence.
- `js/noise.js`, `js/postprocess.js`, `js/encoders.js`, `js/settings.js`, `js/presets.js`, `js/storage.js`, `js/maps.js`, `js/help.js`, `js/view.js`, `js/fields.js`, `js/visibility.js`, `js/summary.js`, `js/sheet.js`: pure logic and data with no DOM access (noise, image adjustments, file encoders, settings, templates, last-used settings, the saved-maps store, setting help texts, zoom maths, numeric field parsing, the rules that show or hide settings, the one-line step summaries, the contact-sheet seeds), tested under Node.
- `js/boot.js`, `js/worker.js`, `js/worker-client.js`, `js/exporter.js`, `js/dialogs.js`, `js/tooltip.js`, `js/library.js`, `js/app.js`: picking the first screen before paint, the Web Worker, file export, modal dialogs, setting tooltips, the saved-map and template lists, and UI wiring.
- `scripts/`: the local static dev server.
- `tests/`: Node tests for the pure logic, the dev server and `index.html` matching the settings.
- `PRODUCT.md`, `DESIGN.md`: product context and the editor's design system (colours, type, components) for future UI work.
- `specs/`: feature and bug-fix specs.
- `prototype/`: the original single-page prototype, kept for reference only.

## Prerequisites

- Node.js 20.11 or newer, to serve the app locally and run the tests. No version is pinned.
- A current browser with module Web Worker support (Chrome, Edge, Firefox or Safari), on desktop, tablet or phone.

## Setup

There is nothing to install. Clone the repository and you're ready.

## Running the app

1. From the repository root, start the dev server:
   ```bash
   npm start
   ```
2. Open http://localhost:5173. Set `PORT` to use another port, e.g. `PORT=8080 npm start`.

The app must be served over HTTP: ES modules and Web Workers don't load from `file://`.

## Running tests

From the repository root:

```bash
npm test
```
