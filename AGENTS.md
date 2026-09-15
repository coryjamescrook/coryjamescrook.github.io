# AGENTS.md — Crookflix

Crookflix is a static, dependency-free website tracking home-theatre showtimes. Retro/glitch design (dark theme, pixel accents, scanline feel). No build step, no framework, no package manager.

## Architecture

- `index.html` — home page (hero, marquee, Upcoming, Archive)
- `collections/*.html` — collection pages
- `style.css` — shared styles, referenced from all pages (relative `../style.css` from `collections/`)
- `app.js` — shared vanilla JS IIFE, drives every page. No external scripts or CDNs.
- `data/*.js` — data files. Each sets `window.CROOKFLIX_DATA` before `app.js` runs (loaded via `<script src="...">` at the bottom of each HTML page):
  - `data/home.js` — home page data, loaded by `index.html`
  - `data/collections/<name>.js` — one file per collection page, loaded by its `collections/<name>.html`
  - Data files are plain JS global assignments (works over `file://` and HTTP alike; no `fetch`, no modules).

## Data model (critical)

All content lives in the page's data file (`data/home.js` or `data/collections/<name>.js`), which assigns `window.CROOKFLIX_DATA`. `loadSiteData()` in `app.js` reads that global (falling back to a legacy inline `#crookflix-data` JSON block if one exists). Mode is detected from the shape of the data:

- **Home**: `{ "upcoming": [ ... ] }` where each item is polymorphic:
  - `{ "kind": "event", id, title, date (YYYY-MM-DD), time (HH:MM), description, trailer? }`
  - `{ "kind": "collection", id, title, description, page, events: [ ... ] }`
    - `page` is the relative path to the collection's HTML page (e.g. `collections/midnight-screams-2026.html`)
    - collection items on the home page **duplicate** the events that live in the collection page
- **Collection page**: `{ "kind": "collection", id, title, description, events: [ ... ] }` — the events array here is the authoritative copy for that collection.

`app.js` renders Upcoming vs. Archive per event by comparing its date+time against the current time.

### Adding content — do this in order

1. Standalone event: add to `upcoming` in `data/home.js`.
2. Collection: add a `{ kind: "collection" }` entry (with `page`) to `upcoming` in `data/home.js`, and create `collections/<name>.html` (which loads `data/collections/<name>.js`) with the full events array in that data file.
3. Keep event IDs unique and stable (`evt-*` for events, `col-*` for collections).

### Removing content

- Removing an event removes the past version from the archive automatically — do not manually purge archive cards.

## Conventions

- **Dates**: ISO `YYYY-MM-DD`. **Times**: 24h `HH:MM`.
- **Trailers**: bare YouTube video IDs; playback is via a YouTube iframe modal driven by `data-trailer` attributes.
- **Styling**: use the existing CSS custom properties in `style.css` (`--accent-1` … `--accent-5`, etc.). Do not introduce a CSS framework.
- **JS style**: IIFE, strict mode, helper functions at the top, no modules, no imports.
- **HTML**: keep `index.html` and collection pages self-contained (same inline `<style>`/`<script>` blocks). Do not extract shared HTML into a template engine. Page content lives in `data/*.js` files, not inline — keep it there.
- **Accessibility**: the existing markup is semantic and minimal; preserve `alt`/labels and don't add ARIA noise.

## Editing guidelines

- Keep changes minimal and consistent with the existing retro aesthetic.
- When the site needs to be served, a plain `python3 -m http.server` or `npx serve .` works — no bundler required.
- Do not add a package.json, node_modules, or external dependencies without explicit request.

## Keeping this file accurate (anti-drift policy)

**Do not commit changes that break this file.** When any of the following is true in a session, update `AGENTS.md` in the same change:

- A preference or style rule changes (tone, naming, color palette, JS conventions, date/time formats).
- Architecture or data-model changes (new fields, new file types, new build steps, dependency additions/removals).
- The meaning of any identifier used above (`window.CROOKFLIX_DATA`, legacy `#crookflix-data`, `page`, `kind`, event/collection IDs) changes.
- New files or directories are added or removed at the top level.

The goal: a future agent or human reading this file should not be surprised by the state of the repo.
