# Product

## What it is
Noisemaker generates procedural, seamlessly tileable grayscale noise maps in the browser (Perlin, Value, Worley and White noise, fractal layering, domain warp, value adjustments) and exports them as PNG, JPG/JPEG, WebP, BMP, TGA or RAW16 heightmaps. Everything runs locally; nothing is uploaded.

## Users and job
- Game developers and technical artists who need textures, masks and heightmaps that repeat without seams.
- They mostly work at a desk on a desktop browser, often next to Photoshop, Substance or a game engine, and judge grayscale values by eye. They also open it on a tablet or phone to browse saved maps and try seeds. *(Inferred from the brief and README.)*
- The job: dial in a pattern quickly, check that it tiles, and export it at the right size and format.

## Constraints
- Output is grayscale only, black to white.
- Every offered setting must tile seamlessly; options that can't tile aren't offered.
- Static site with no backend, served from the repository root (planned for GitHub Pages).
- Plain HTML, CSS and ES modules; no framework, no build step, no runtime dependencies.

## Platform
web

## Brand commitments
- "Darkroom": a calm, warm-charcoal workroom with a single amber accent, where the map is shown like a photographic print on a cream mat and alternative seeds sit on a contact sheet.
- The chrome is deliberately warm (the user's choice); the map itself is always grayscale, and the cream mat gives a light frame to judge its values against.

## Features
- A start screen listing the saved maps (open, delete) with "New map", which starts a blank map or one from a template.
- Saved maps in the browser with save, overwrite and save-as-new, and a "Load map" dialog in the editor offering saved maps or templates (the presets).
- Settings as numbered steps (Pattern, Detail, Tone, Export) with one-line summaries, and a contact sheet of four seeds to compare and adopt, with Shuffle for new ones.
