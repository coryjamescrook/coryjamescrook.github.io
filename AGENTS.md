# AGENTS.md — Crookflix

Crookflix is a static, dependency-free **single-page application** tracking home-theatre showtimes. Retro/glitch design (dark theme, pixel accents, scanline feel). No build step, no framework, no package manager. Works over `file://` and HTTP (GitHub Pages).

## Architecture

- **`index.html`** — the *single* HTML file (the SPA shell). Contains persistent chrome (loader, progress bar, nav, footer, video modal) once, a `<main id="view">` route container, and the ordered `<script>` loads. There are no longer any `collections/*.html` pages — collection pages are in-app routes rendered generically from data.
- **`components.js`** — shared **light-DOM custom elements** (no Shadow DOM) that encapsulate markup + behavior. Loaded in `<head>` after `session.js`. Each element builds its own inner markup in `connectedCallback` (or via a setter), so it is self-contained regardless of how it is authored in HTML.
- **`app.js`** — single vanilla JS IIFE. Owns: data loading, date/ordering helpers, the **hash router**, route renderers (mounting the `<cx-event-card>` / `<cx-collection-card>` elements and the collection hero), the scroll-reveal observer, and `window.Crookflix.goto()` used by the nav. It exposes its pure helpers on `window.CrookflixRender` for the card/hero elements to consume.
- **`session.js`** — tiny shared IIFE loaded in `<head>` (before body content). If the `crookflix-session-loaded` flag is already in `sessionStorage` it removes the `#loading` screen immediately, so the loader only appears on the site's first load per tab session. `app.js` sets the flag on first init.
- **`style.css`** — shared styles. Elements carry the same **class names** used before (`.event-card`, `.hero`, `.nav-logo`, `.modal-overlay`, etc.), so the existing class-based rules apply unchanged. Only two tag-scoped rules were added (`cx-collection-card { display:block; cursor:pointer }` for the non-`<a>` clickable card, and the nav/footer rely on their own class children).
- **`data/*.js`** — data files, run as plain JS IIFEs (works over `file://` and HTTP alike; no `fetch`, no modules):
  - `data/collections/<name>.js` — one per collection. Registers itself in **`window.CROOKFLIX_COLLECTIONS`** (keyed by collection `id`) **and `window.CROOKFLIX_COLLECTIONS_BY_SLUG`** (keyed by `slug`, used for routing). It does **not** set `window.CROOKFLIX_DATA`.
  - `data/home.js` — home route data. Sets `window.CROOKFLIX_DATA`. Collection entries resolve `title`, `description`, `slug`, and `events` from the `CROOKFLIX_COLLECTIONS` registry at load time, so events are defined exactly once (in the collection file).
  - **Load order in `index.html`:** `session.js` (head) → `components.js` (head) → `data/collections/*.js` (in any order) → `data/home.js` → `app.js`.

### Custom elements (defined once in `components.js`)

| Element | Renders | Behavior / API |
|---|---|---|
| `<cx-site-loader class="loading-screen" id="loading">` | the `.loading-screen` panel | `.hide()` adds `.hidden`; `session.js` removes the host directly |
| `<cx-progress-bar id="progress-bar">` | the fixed progress bar | owns its scroll listener |
| `<cx-nav>` | the `<nav>` (logo + Upcoming/Archive) | logo → `#/`; nav links call `window.Crookflix.goto(anchor)` (smooth-scroll on home, navigate-home-then-scroll on a collection) |
| `<cx-home-hero class="hero" subtitle="...">` | the home hero | generates the pixel field + types the `subtitle` |
| `<cx-collection-hero class="hero collection-hero" data-label data-home data>` | a collection hero | set `.data` (the collection object) to render; label prefers the object's `label`, falls back to `data-label`; back-link target is `data-home` |
| `<cx-footer>` | the `<footer>` | generates the 12 footer pixels |
| `<cx-video-modal>` | the `#video-modal` overlay | document-wide `[data-trailer]` delegation + Escape/click-out/close; exposes `.open(id)` / `.close()`; toggles `.active` on the inner `.modal-overlay` |
| `<cx-event-card>` | one event card | set `.event` (object) before connect; host carries `.event-card` |
| `<cx-collection-card>` | one home/archive collection entry | set `.collection` (object) + `.archived` (bool); click navigates to `#/c/<slug>` |

**Relocated behavior** (moved out of `app.js` into the elements above): `initProgressBar`, `initVideoModal`, `generateFooterPixels`, `generateHeroPixels`, `typeText`, and both card templates. `app.js`'s `buildEventCard`/`buildCollectionCard` are now thin wrappers that create the element and set its props.

## Routing (hash-based)

- `#/` (or empty hash) — **home** route (hero, marquee, Upcoming, Archive).
- `#/c/<slug>` — **collection** route (hero + Screening List), resolved via `CROOKFLIX_COLLECTIONS_BY_SLUG[slug]`.
- unknown `#/c/<slug>` (or unrecognizable hash) — **not-found** view.
- The router listens to `hashchange`, swaps visibility of the `.route[data-route=…]` blocks inside `#view`, sets `document.title`, and re-runs the scroll-reveal observer. Back/Forward work via `hashchange`.
- `slug` replaces the old `page` (relative HTML path) as the identity for navigation. `id` (e.g. `col-004`) is retained as the registry key.

## Data model (critical)

`loadSiteData()` in `app.js` reads `window.CROOKFLIX_DATA`. The home data shape and the polymorphic `upcoming` array are unchanged:

- **Home** (`data/home.js`, assigned to `window.CROOKFLIX_DATA`): `{ "upcoming": [ ... ] }` where each item is:
  - `{ "kind": "event", id, title, datetime (ISO 8601 | null/undefined), description, trailer?, tags? }` — `tags` is an optional array of short label strings rendered as chips.
  - `{ "kind": "collection", id }` — minimal reference. `data/home.js` resolves `title`, `description`, `slug`, and `events` from the `CROOKFLIX_COLLECTIONS` registry at load time. Optional inline overrides (`title`, `description`, `slug`, `events`) may be supplied but should not be needed. **Do not duplicate events in `home.js`** — the collection file is the single source of truth.
- **Collection** (`data/collections/<name>.js`): `{ "kind": "collection", id, slug, label?, title, description, events: [ ... ] }`. `slug` is the route identifier; `label` is the optional hero label (e.g. `// CURATED SET`, `// ARCHIVE`); `events` is the authoritative copy.

### Time model

- Every event timestamp lives in a single `datetime` field as an **ISO 8601 string with an explicit UTC offset**, e.g. `"2026-10-28T20:30:00-05:00"`. `datetime` may be **omitted, `null`, or `undefined`** for unscheduled events — rendered as **`TBD`**.
- Offsets use the **`America/Winnipeg`** timezone as the venue: CDT `−05:00` from Mar 8–Nov 1 (first Sun), CWT `−06:00` otherwise. Choose the offset matching the event's own date.
- Parsed with `new Date(datetime)`; rendered in the **viewer's browser-local** timezone.
- Do not reintroduce separate `date`/`time` string fields; everything flows through `datetime`.

### Ordering & TBD behavior

Upcoming vs. Archive is decided per event by comparing `datetime` against the current time. Ordering is always chronological ascending via `sortedEvents`. **TBD showtimes** (`datetime` null/undefined) display a `TBD` stamp, are never archived (treated as upcoming), and always sort last (ties broken alphabetically by title).

### Adding content — do this in order

1. **Standalone event:** add to `upcoming` in `data/home.js`.
2. **Collection:**
   1. Create `data/collections/<slug>.js` with `{ id, slug, label?, title, description, events: [...] }` and the `CROOKFLIX_COLLECTIONS`/`CROOKFLIX_COLLECTIONS_BY_SLUG` registration at the bottom.
   2. Add one `<script src="data/collections/<slug>.js"></script>` line to `index.html` **before** `data/home.js`.
   3. (Optional) add `{ "kind": "collection", "id": "<id>" }` to `upcoming` in `data/home.js` to surface it on the home route.
   - **No HTML file is needed.** No new element, no new CSS, no router change.
3. Keep event IDs unique and stable (`evt-*` for events, `col-*` for collections) and slugs URL-safe (`[a-z0-9-]`).

### Removing content

- Removing an event removes the past version from the archive automatically — do not manually purge archive cards.
- Removing a collection: delete its `data/collections/<slug>.js`, remove its `<script>` tag from `index.html`, and remove its `upcoming` entry from `data/home.js` if present.

## Conventions

- **Dates**: single `datetime` ISO 8601 field with an explicit `America/Winnipeg` UTC offset.
- **Tags**: optional `tags` array of short label strings per event, rendered as pixel chips. Keep them short (one word, hyphenated compounds allowed).
- **Trailers**: bare YouTube video IDs; playback is via the `<cx-video-modal>` element driven by `data-trailer` attributes on the trailer button.
- **Styling**: use the existing CSS custom properties in `style.css` (`--accent-1` … `--accent-5`, etc.). Light-DOM elements keep their class names, so existing selectors keep working. Do not introduce a CSS framework.
- **JS style**: IIFE, strict mode, helper functions near the top, no modules, no imports, no `fetch` (preserves `file://`).
- **Custom elements**: define once in `components.js`; register idempotently (`customElements.get` guard). Elements create their own inner markup. Card/hero elements receive their content via property setters (`.event`, `.collection`, `.data`), not by parsing inner HTML.
- **Routing**: hash routes only (`#/`, `#/c/<slug>`). Do not add History-API clean URLs without also adding a GitHub Pages 404-fallback and dropping the `file://` goal.
- **Accessibility**: markup is semantic and minimal; preserve labels, don't add ARIA noise.

## Editing guidelines

- Keep changes minimal and consistent with the existing retro aesthetic.
- Serve with a plain `python3 -m http.server` or `npx serve .` — no bundler required. Verify over **both** HTTP and `file://`.
- Do not add a package.json, node_modules, or external dependencies without explicit request.

## Keeping this file accurate (anti-drift policy)

**Do not commit changes that break this file.** When any of the following is true in a session, update `AGENTS.md` in the same change:

- A preference or style rule changes (tone, naming, color palette, JS conventions, date/time formats, card features).
- Architecture or data-model changes (new fields, new files, new element, new routes, dependency additions/removals).
- The meaning of any identifier used above (`window.CROOKFLIX_DATA`, `CROOKFLIX_COLLECTIONS`, `CROOKFLIX_COLLECTIONS_BY_SLUG`, `slug`, `id`, `label`, `kind`, `datetime`, the `<cx-*>` elements, route shapes) changes.
- New files or directories are added or removed at the top level, or an element is added/removed.

The goal: a future agent or human reading this file should not be surprised by the state of the repo.
