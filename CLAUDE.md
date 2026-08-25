# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

**Run the dev server:**

```bash
node serve.mjs
```

Serves on port 3333 by default (override with `PORT` env var). Open `http://localhost:3333`.

**Dev modes** (append to any URL, including direct article links):

- `?dev-mode=blog-list` — blog panel opens and stays open; won't close on outside clicks
- `?dev-mode=blog-article` — blog panel opens and the first article loads automatically
- `?dev-mode=code-list` — "Writes Code" panel opens and stays open; won't close on outside clicks
- `?dev-mode=code-project` — "Writes Code" panel opens and the first project loads automatically
- `?dev-mode=music-list` — "Makes Music" panel opens and stays open; won't close on outside clicks
- `?dev-mode=moodboard` — "Collects Moods" panel opens and stays open; won't close on outside clicks

**No build step, no package manager.** This is a vanilla JS project — no npm, no bundler, no transpilation.

**Target devices:** Development is on a MacBook Pro (desktop Safari + Chrome) and iPhone (iOS Safari). No Android or other mobile browsers to support.

**Environment:** Contentful credentials go in `.env` (see `.env.example`. The server reads these and exposes them to the browser at runtime via the `/contentful-env.js` endpoint as `window.CONTENTFUL_CONFIG`.

## Architecture

### Single-Page Application

`index.html` is the sole HTML document. Content is structured as mutually exclusive dropdown panels: Blog, Writes Code, Makes Music, Collects Moods. Each panel uses a two-pane pattern: list view → detail view (with back navigation).

### Web Components

UI is built entirely with native Custom Elements (`customElements.define`). Key components:

- `DropdownPanel` / `DropdownTrigger` — coordinate open/close state via `dropdown:state-changed` and `dropdown:close-all` custom events
- `BlogIntroSection`, `MoodboardPanel`, `CodePanel`, `MusicPanel` — panel-level components that own their data fetching and rendering
- `ImageElement`, `AccessibleSelect` — reusable primitives

Components communicate through DOM events, not shared global state.

### Contentful / Data Fetching

All content comes from Contentful via GraphQL. Queries and fetch logic live in `js/contentful-graphql.js`, exposed as functions on `window`. The pattern is:

- Functions return `{ data, errors }` tuples
- Large collections are fetched in 100-item batches (Contentful API limit)
- Infinite scroll uses `IntersectionObserver` for lazy pagination (blog, moodboard)

Rich text from Contentful is rendered via `@contentful/rich-text-html-renderer` (loaded from ESM CDN, no local install).

### CSS conventions

**Always invoke the `/css` skill when writing or editing any HTML or CSS.** It contains the full utility class reference, enforced rules, and architecture decisions. Do not write or review CSS without it loaded.

Never write inline styles (`style="..."`). Always use a CSS class in the appropriate `css/` file.

Never use `px` units in CSS. All units must be relative — use `rem` for sizes and spacing, `em` where relative-to-parent sizing is appropriate, `%` or viewport units for layout.

### CSS Architecture

Each component has its own CSS file in `css/`. `css/reset.css` establishes global CSS custom properties (`--color-*`) and base resets. Naming follows BEM-like conventions: `.panel-list__item`, `.blog-post__body`.

`css/css-utils.css` is the project's utility class system — a lightweight Tailwind-style set of single-purpose classes for layout, spacing, typography, and display. Always prefer these over writing new component CSS when a utility covers the need. The full class list is in the `/css` skill.

### Accessibility

Panels use `aria-expanded`, `aria-live="polite"`, `aria-hidden`, and `inert` to manage focus and screen reader state. When adding interactive elements, maintain these patterns: return focus to the trigger on close, use semantic HTML (`<button>`, `<article>`, `<ul>`/`<li>`), and respect `prefers-reduced-motion` in animations.
