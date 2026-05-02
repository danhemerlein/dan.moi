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

**Environment:** Contentful credentials go in `.env` (see `.env.example` or `js/contentful-config.example.js`). The server reads these and exposes them to the browser at runtime via the `/contentful-env.js` endpoint as `window.CONTENTFUL_CONFIG`.

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

### CSS Architecture

Each component has its own CSS file in `css/`. `css/reset.css` establishes global CSS custom properties (`--color-*`) and base resets. Naming follows BEM-like conventions: `.panel-list__item`, `.blog-post__body`.

For full CSS rules and conventions, use the `/css` skill.

### Accessibility

Panels use `aria-expanded`, `aria-live="polite"`, `aria-hidden`, and `inert` to manage focus and screen reader state. When adding interactive elements, maintain these patterns: return focus to the trigger on close, use semantic HTML (`<button>`, `<article>`, `<ul>`/`<li>`), and respect `prefers-reduced-motion` in animations.
