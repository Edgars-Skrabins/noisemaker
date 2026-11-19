---
name: Noisemaker — Darkroom
description: A warm-charcoal workroom where noise maps are shown as prints on a cream mat.
colors:
  ground: "#1A1714"
  panel: "#24201C"
  panel-hover: "#2A2521"
  raised: "#2E2924"
  raised-hover: "#38322B"
  pressed: "#423A31"
  well: "#110F0D"
  line: "#3A332C"
  line-strong: "#4A4238"
  line-soft: "#26211D"
  selected: "#3A2C1A"
  text: "#EFE7DC"
  text-2: "#B3A797"
  text-3: "#998D7F"
  accent: "#E8A24A"
  accent-hover: "#F0B061"
  accent-active: "#D9923A"
  on-accent: "#221608"
  mat: "#EFE7DC"
  tooltip: "#332D27"
  error: "#EF8A6F"
  preview-empty: "#808080"
  mark-1: "#E0E0E0"
  mark-2: "#B5B5B5"
  mark-3: "#888888"
  mark-4: "#555555"
typography:
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.45
  step-title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: 1.45
  dialog-title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  empty-title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
  map-name:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  map-name-phone:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
  page-title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  page-title-phone:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
  number:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1
  micro:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.12em"
  touch-input:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  hairline: "1px"
  print: "2px"
  segment: "3px"
  control: "4px"
  scrollbar: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "16px"
  side: "20px"
  stage: "32px"
components:
  button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 14px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "34px"
  tool:
    textColor: "{colors.text-2}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 10px"
  tool-on:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.text}"
  field:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "30px"
    padding: "0 8px"
  segment-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.text}"
    rounded: "{rounded.segment}"
    height: "26px"
  step-head:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.step-title}"
    height: "48px"
  print:
    backgroundColor: "{colors.mat}"
    rounded: "{rounded.print}"
    padding: "14px 14px 46px"
  tooltip:
    backgroundColor: "{colors.tooltip}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "280px"
---

# Noisemaker design system: Darkroom

## Overview
A calm darkroom for making noise maps. Settings sit in a warm-charcoal sidebar as numbered steps; the map is shown like a photographic print on a cream mat, laid on a deep well; alternative seeds lie on a contact sheet beneath it. Mode: Operate. Brand lives in precise details (the mat, mono numbers, the single amber accent), never in decoration.

## Colors
- Warm charcoal chrome, chosen by the user. Layers from dark to light: `well` (the stage behind the print and inside fields), `ground` (start screen, contact sheet), `panel` (sidebar, dialogs), `panel-hover` (step headers on hover), `raised` / `raised-hover` / `pressed` (buttons and their states).
- Lines: `line` between steps and around fields, `line-strong` on button and checkbox borders, `line-soft` for the quiet rules on the stage.
- One amber accent. `accent` marks focus rings, the open step's number, slider fill, checked boxes and radios, the unsaved dot, the current contact-sheet frame, the open map and progress. It sits behind text only on primary buttons and the small "Open" badge, always with `on-accent` text (≥ 7:1).
- `selected` (deep amber-brown) with a 1 px amber edge marks selected segments, tabs and pressed toggles (Tile 2×2, Fit).
- The map is grayscale and never tinted. The cream `mat` frames it with a light, near-neutral border so values read against both a light and a dark edge. `preview-empty` is the mid-gray shown before the first render.
- Text: `text` for values, titles and names; `text-2` for labels, summaries and meta; `text-3` (≥ 4.5:1 on `panel` and `panel-hover`) for icons, step numbers at rest and idle readouts.

## Typography
- IBM Plex Sans for the UI and IBM Plex Mono for numbers (fields, zoom, status line, seeds, summaries, dates), step numbers and uppercase micro-labels (brand, "Contact sheet", "Not saved", the saved-map count). Both are self-hosted woff2 subsets in `fonts/` (Latin-1 and Latin Extended-A for Sans, Latin-1 and the maths subset for Mono) so the CSP stays `'self'`-only.
- 13 px body, 12.5 px property labels, 13.5 px semibold step titles, 22 px semibold map name (20 px on phones), 30 px page title on the start screen (24 px on phones). Micro-labels are 11 px, mono, uppercase, tracked 0.08–0.16 em; nothing functional goes below 11 px.
- Numbers use tabular figures so values don't jitter while dragging.

## Layout
- **Editor, ≥ 1100 px:** a grid with a 360 px sidebar (head, scrolling steps, footer) and the stage. Sidebar padding 20 px.
- **Tablet, 760–1099 px:** sidebar 320 px with 16 px padding; stage toolbar buttons become icon-only (Tile 2×2 keeps its label); the export size leaves the status line.
- **Phone, < 760 px:** one scrolling column: sidebar head, stage (toolbar in two rows: actions and Tile 2×2, then the zoom controls; the print up to 62 % of the screen height; status; contact sheet with four frames in a row), the steps, and the footer stuck to the bottom with a soft upward shadow. Below 420 px Load map and Save become icon-only.
- **Sidebar head:** brand (mono caps, with the mat-coloured mark) and "My maps" (back to the start screen); the map name, the amber unsaved dot and the "Not saved" tag.
- **Steps** (`details.step[name="steps"]`): 01 Pattern, 02 Detail, 03 Tone, 04 Export, numbered by a CSS counter so hidden steps (Detail for White noise) don't leave gaps. One step open at a time; the closed ones show a mono one-line summary on the right. The open step's number turns amber and its summary hides.
- **Footer:** progress bar, Load map, Save and the wide primary Export.
- **Stage:** toolbar (Randomize, Reset | Tile 2×2, zoom out, level, zoom in, Fit, 100%), the busy sweep, the scrolling viewport with the print, a mono status line, and the contact sheet.
- **Start screen:** brand row, then the 30 px "Your maps" heading with the mono count and "New map", over a rule; the saved maps as prints (min 176 px, 32/24 px gaps; 132 px and two columns below 420 px). Empty state: a `panel` box with the text and "New map".

## Elevation & Depth
- Regions separate by value steps and 1 px lines. Elevation is declared once per element, either a line or a shadow, never both.
- Shadows: prints and thumbnails (a 1 px contact shadow plus a soft drop), lifted thumbnails on hover, the tooltip and toast, dialogs (no border, a deep soft shadow over a dark backdrop), and the sticky phone footer.

## Shapes
- 4 px radius on controls, buttons, fields, dialogs, tooltip, toast and boxes; 3 px on segments, tabs and checkboxes; 2 px on prints and thumbnails.
- Icons: inline SVG sprite on a 16 px grid, 1.5 px stroke, round caps and joins, `currentColor`.

## Components
- **Tool** (`.tool`): transparent, `text-2`; hover `raised` with `text`; on (`aria-pressed`, checked toggle) `selected` with an amber edge. 32 px; `.icon-only` 32 × 32.
- **Button** (`.btn`, `.btn.primary`): 34 px (38 px in the footer); primary is amber with `on-accent` text.
- **Step** (`.step`): 48 px header with mono number, title, summary and a chevron that flips when open; body padding 2/20/20 px, 10 px between rows.
- **Property row** (`.prop`): 96 px label column (88 px on tablets) with an info button, then the control.
- **Slider**: 3 px track filled amber up to the value, 14 px cream thumb with a panel ring; grows on hover, amber ring on keyboard focus. Always paired with a mono numeric field (`.num`) that commits on Enter or blur, steps with arrow keys (Shift ×10) and reverts on Escape.
- **Segmented** (`.segmented`) and **tabs** (`.tabs`): a `well` trough; the selected item is `selected` with an amber inset edge.
- **Checkbox** and **radio**: 16 px; checked is amber with a dark check or dot.
- **Info button** (`.info`): drawn "i" in `text-3`, amber on hover or open; opens the shared tooltip on hover (350 ms), keyboard focus or click. Tips for settings open to the right of the sidebar when there is room.
- **Print** (`.print`): cream mat, 14/14/46 px (8/8/26 px on phones), around the canvas, which gets a faint ink line.
- **Contact sheet** (`.sheet`): mono micro-label, Shuffle, and four frames (`.frame`): a 4 px-matted thumbnail with its mono seed below. The current seed's frame has an amber ring and amber seed; others lift on hover.
- **Map card** (`.map-card`): a 5 px-matted thumbnail like a small print, name in medium weight, mono meta line; hover lifts it; focus and the open map get an amber ring with a `--card-gap` gap; the "Open" badge is a small amber mono tag; the delete button appears on hover or focus and is always shown on touch.
- **Dialog** (`dialog.dialog`, opened with `openDialog` from `js/dialogs.js`): `panel`, 4 px radius, no border, deep shadow, 66 % warm-black backdrop; 52 px header with a 15 px semibold title; 18 px body; footer with Cancel then the primary action. Errors in `error` under the field.
- **Status line**: render state, export size and format, cursor position in export pixels and the height value (0–1 and 0–255); the cursor readout hides on devices without hover.

## Touch
- On `pointer: coarse` every control reaches about 44 px: 56 px step headers, 44 px tools and buttons, 42 px fields with 16 px text (so iOS doesn't zoom), 44 px segments, tabs and delete buttons, 22 px checkboxes in 44 px rows, 24 px slider thumbs on 44 px tracks, and info buttons whose hit area grows to 44 px without moving the layout.

## Motion
- State changes only: 120–220 ms on an exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`): hover lifts on prints, the chevron flip, colour changes, the toast. The busy sweep is the only loop and marks rendering. `prefers-reduced-motion` turns transitions and lifts off and makes the sweep a static bar.

## Do's and Don'ts
- Do reuse these tokens; add a colour only when it carries state, and never tint the map.
- Do give every new setting a help text in `js/help.js` and place it in the right step; the tests fail otherwise.
- Do keep numbers in Plex Mono with tabular figures.
- Do keep fonts and every other asset self-hosted; the CSP allows `'self'` only.
- Don't put amber behind text except the primary action and the "Open" badge.
- Don't use gradients (other than the slider's value fill), glows, glass, large radii, or a border together with a wide shadow.
- Don't set functional text below 11 px.
