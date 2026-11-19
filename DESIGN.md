---
name: Noisemaker
description: A dense, neutral dark editor for tileable grayscale noise maps.
colors:
  ground: "#1b1b1b"
  pasteboard: "#222222"
  panel: "#2b2b2b"
  bar: "#252525"
  raised: "#363636"
  raised-hover: "#404040"
  pressed: "#4a4a4a"
  well: "#1c1c1c"
  line: "#3a3a3a"
  line-strong: "#4a4a4a"
  edge: "#141414"
  text: "#e3e3e3"
  text-2: "#a6a6a6"
  text-3: "#8a8a8a"
  accent: "#3b8ced"
  accent-fill: "#2a6ccf"
  accent-fill-hover: "#2a74d6"
  accent-fill-active: "#2168cc"
  on-accent: "#ffffff"
  tooltip: "#3d3d3d"
typography:
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
  panel-title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
  brand:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  control: "3px"
  segment: "2px"
  overlay: "4px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  canvas: "24px"
components:
  button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "28px"
    padding: "0 12px"
  button-hover:
    backgroundColor: "{colors.raised-hover}"
  button-primary:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.accent-fill-hover}"
  tool:
    textColor: "{colors.text-2}"
    rounded: "{rounded.control}"
    height: "24px"
    padding: "0 8px"
  tool-hover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
  tool-pressed:
    backgroundColor: "{colors.raised-hover}"
    textColor: "{colors.text}"
  field:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "22px"
    padding: "0 6px"
  segment-selected:
    backgroundColor: "{colors.pressed}"
    textColor: "{colors.text}"
    rounded: "{rounded.segment}"
    height: "20px"
  panel-head:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.text}"
    typography: "{typography.panel-title}"
    height: "26px"
  tooltip:
    backgroundColor: "{colors.tooltip}"
    textColor: "{colors.text}"
    rounded: "{rounded.overlay}"
    padding: "8px 10px"
    width: "260px"
---

# Noisemaker design system

## Overview
A working image-editor shell in the tradition of Photoshop, opened from a start screen of saved maps: top bar, canvas workspace in the centre, docked collapsible panels on the right, an options bar above the canvas and a status bar below it. The map is the only thing on screen with real value contrast; everything around it is quiet, dense and achromatic. Mode: Operate. The tool should disappear into the task.

## Colors
- All chrome is true neutral gray (equal R, G and B). Never tint the ground, panels or pasteboard warm or cool: users judge grayscale values by eye and a tinted surround shifts them.
- Layers from dark to light: `edge` (1 px separators between regions), `ground`, `well` (inside fields), `pasteboard` (behind the canvas), `bar` (top bar, options bar, status bar, panel headers), `panel` (dock), `raised` / `raised-hover` / `pressed` (controls and their states).
- One accent blue. `accent` marks focus rings, checked checkboxes, the open map card, the render bar and progress. `accent-fill` (deeper, ≥4.5:1 with white) is the only accent used behind text: the primary button.
- Text: `text` for values and primary labels, `text-2` for property labels and secondary chrome, `text-3` only for icons (info buttons).

## Typography
- System UI stack, no web fonts. 12 px base, 11 px for panel titles (semibold, sentence case, never uppercase) and the status bar, 13 px semibold for the brand, 15 px semibold for the start screen's "Your maps" heading (the only larger step).
- Numbers in fields, the zoom level and the status bar use `tabular-nums` so values don't jitter while dragging.

## Layout
- Desktop: CSS grid. Top bar 36 px; workspace = canvas area (options bar 32 px, scrollable viewport with 24 px padding, status bar 22 px) + dock 304 px.
- Property rows: 78 px label column + flexible control column, 8 px gap, 4 px between rows; sliders take the remaining width next to a 54 px numeric field.
- Below 760 px: the page scrolls, the top bar is sticky with icon-only buttons, the canvas area is 55vh above a full-width dock.
- Top bar: brand, then the map name (with a dot marker for unsaved changes and a "Not saved" note for never-saved maps), Randomize and Reset; Load map and Save on the right. The brand is a button (`.home`) that returns to the start screen, asking first when there are unsaved changes; on the start screen it is disabled and the top bar shows only the brand.
- Start screen (`.start`): a scrolling `pasteboard` surface with a centred column (max 1040 px, 24 px padding; 16 px below 760 px). A header row with the "Your maps" title, a `text-2` count and the "New map" primary button, over a `line` divider; then the saved-map cards (min 160 px, 16 px gap; 104 px below 760 px). With no saved maps the grid and header button give way to an empty-state box (`panel`, `line` border, 4 px radius) holding the text and the "New map" button. "New map" opens a dialog of template cards, "Blank" first.

## Elevation & Depth
- Regions are separated by 1 px `edge` lines and value steps, not shadows.
- Shadows exist on four things only: the canvas (a 1 px dark ring plus a soft 2/8 px drop), the tooltip, the toast and dialogs (6/18 px, 50% black).

## Shapes
- 3 px radius on controls and buttons, 2 px on segments, checkboxes and map thumbnails, 4 px on tooltip, toast and dialogs, 0 on panels and bars.
- Icons: inline SVG sprite on a 16 px grid, 1.5 px stroke, round caps and joins, `currentColor`.

## Components
- **Tool button** (`.tool`): transparent, `text-2`, hover `raised`; pressed/toggled state `raised-hover` with `text`. `.icon-only` is 24 × 24.
- **Button** (`.btn`) and **primary button** (`.btn.primary`): 28 px tall, used in the Export panel.
- **Panel** (`details.panel > summary.panel-head`): chevron rotates 90° when open; body padding 8/10/10 px.
- **Property row** (`.prop`): `.prop-label` with an info button, then `.prop-control`.
- **Slider**: 3 px neutral track filled with `#8f8f8f` up to the value, 11 px light thumb, accent ring on keyboard focus. Always paired with a numeric text field (`.num`) that commits on Enter or blur, steps with arrow keys (Shift ×10) and reverts on Escape.
- **Segmented** (`.segmented`): radio group in a `well` trough; the selected segment is `pressed` with a 1 px `#5a5a5a` inset.
- **Checkbox** (`.check`): 14 px, `accent` fill with a white check when on.
- **Info button** (`.info`): 16 px, drawn "i" icon in `text-3`; opens the shared fixed tooltip on hover (350 ms), keyboard focus or click; Escape, blur, outside click or scroll closes it. In the dock the tooltip opens to the left of the dock.
- **Dialog** (`dialog.dialog`, opened with `openDialog` from `js/dialogs.js`): native modal `<dialog>`, `panel` surface, 1 px `line-strong` border, 4 px radius, 50% black backdrop; a 34 px `bar` header with a 12 px semibold title, a 12 px padded body and a right-aligned footer (Cancel, then the primary action). Tab wraps inside; Escape and Cancel close it and focus returns to the opener. `confirmDialog` is the shared confirmation, with focus on Cancel. Errors are 11 px text in `--error` under the field.
- **Tabs** (`.tab` in `.tabs`): the segmented style in a `well` trough, `role="tablist"`, arrow keys move between tabs.
- **Map card** (`.map-card`): square thumbnail with 2 px radius and a `line` ring, name, `text-2` meta line; hover lightens the ring, focus and the open map get the accent ring (its gap takes `--card-gap`, the surface colour behind the grid), an "Open" badge marks the open map; the delete icon button appears on hover or focus.
- **Status bar**: render state, export size and format, cursor position in export pixels and the height value (0–1 and 0–255).

## Do's and Don'ts
- Do keep every new surface achromatic and reuse these tokens; add a colour only when it carries state (error, warning) and never near the canvas.
- Do give every new setting a help text in `js/help.js`; the tests fail otherwise.
- Do keep motion to state changes, 120–180 ms, ease-out, and respect `prefers-reduced-motion`.
- Don't use gradients, glows, glass, coloured shadows or large radii.
- Don't uppercase panel titles or labels, and don't add eyebrow labels above headings.
- Don't put the accent behind text other than on the single primary action of a panel or dialog.
