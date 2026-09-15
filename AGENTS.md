# AGENTS.md — Crookflix

Crookflix is a static, dependency-free website tracking home-theatre showtimes. Retro/glitch design (dark theme, pixel accents, scanline feel). No build step, no framework, no package manager.

## Architecture

- `index.html` — home page (hero, marquee, Upcoming, Archive)
- `collections/*.html` — collection pages
- `style.css` — shared styles, referenced from all pages (relative `../style.css` from `collections/`)
- `app.js` — shared vanilla JS IIFE, drives every page. No external scripts or CDNs.
- `data/*.js` — data files, run as plain JS IIFEs (works over `file://` and HTTP alike; no `fetch`, no modules):
  - `data/collections/<name>.js` — one per collection. Sets the collection object on `window.CROOKFLIX_DATA` (authoritative for its own page) **and** registers itself in the shared `window.CROOKFLIX_COLLECTIONS` registry keyed by collection id.
  - `data/home.js` — home page data. Sets `window.CROOKFLIX_DATA`. Collection entries resolve their events from the `window.CROOKFLIX_COLLECTIONS` registry, so events are defined exactly once (in the collection file).
  - Load order in `index.html`: collection files first, then `home.js`, then `app.js`. In `collections/<name>.html`: just that collection's file, then `app.js`.

## Data model (critical)

All content lives in the page's data file (`data/home.js` or `data/collections/<name>.js`), which assigns `window.CROOKFLIX_DATA`. `loadSiteData()` in `app.js` reads that global (falling back to a legacy inline `#crookflix-data` JSON block if one exists). Mode is detected from the shape of the data:

- **Home**: `{ "upcoming": [ ... ] }` where each item is polymorphic:
  - `{ "kind": "event", id, title, date (YYYY-MM-DD | null), time (HH:MM | null), description, trailer? }`
  - `{ "kind": "collection", id, page }` — minimal reference. `data/home.js` resolves `title`, `description`, and `events` from the `window.CROOKFLIX_COLLECTIONS` registry (populated by `data/collections/<name>.js`) at load time. Optional inline overrides (`title`, `description`, `events`) may be supplied but should not be needed.
    - `page` is the relative path to the collection's HTML page (e.g. `collections/midnight-screams-2026.html`)
    - **Do not duplicate events in `home.js`** — the collection file is the single source of truth.
- **Collection page**: `{ "kind": "collection", id, title, description, events: [ ... ] }` — the events array here is the authoritative copy for that collection.

`app.js` renders Upcoming vs. Archive per event by comparing its date+time against the current time. Ordering is always chronological ascending (date, then time) via `sortedEvents`. **TBD showtimes**: `date` and/or `time` may be `null`/`undefined` to mean the showtime is not yet decided; the card displays a `TBD` stamp (or partial `TBD` for only one of the two) in place of the real value, such events are never archived (treated as upcoming) and always sort last, tied broken alphabetically by title, and the "Add to Calendar" button is hidden for them.

### Adding content — do this in order

1. Standalone event: add to `upcoming` in `data/home.js`.
2. Collection: create `collections/<name>.html` (which loads `data/collections/<name>.js`) with the full events array in that data file, then add a `{ "kind": "collection", id, page }` entry to `upcoming` in `data/home.js` (resolve its `id` to the collection file's `id`). Also add the collection file's `<script>` tag to `index.html` before `data/home.js`.
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
