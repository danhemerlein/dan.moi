# Change Log

<!-- commit-docs:last-sha=df004860179e5d6e9dca90d203c7a5260d358617 -->

## Initial Commit Establishes the Site Shell

**Date:** 2026-03-21 · **Commit:** `8682780`

The initial commit lays down the site's foundation: a single `index.html` document, a `reset.css`/`fonts.css`/`index.css` stylesheet set, and a small collection of vanilla JavaScript modules (`dropdown.js`, `dropdown-image.js`, `image.js`, `contentful-graphql.js`, `note-taker-posts.js`) registered as native custom elements. `serve.mjs` adds a dependency-free Node development server, and the 00Hypertext font family ships as local `.woff`/`.woff2` assets.

### Running the site locally

1. Run `node serve.mjs` from the project root.
2. Open `http://localhost:3333` in a browser.

## Blog List and Article Content Land

**Date:** 2026-03-21 · **Commit:** `6576f0b`

`blog-panel.js` and `blog-utils.js` replace `note-taker-posts.js` as the source of the blog panel's list and article views, backed by a new `css/blog.css` stylesheet. `js/layout-debug.js` adds an on-screen layout inspector for development, and `contentful-graphql.js` gains the queries the blog panel needs to fetch posts.

## Blog Filters and Pagination

**Date:** 2026-03-22 · **Commit:** `efd3ee1` · **PR:** #1

The blog panel's list view now supports filtering and infinite-scroll pagination. `js/accessible-select.js` introduces a reusable, keyboard- and screen-reader-accessible `<select>` replacement as its own custom element, and `blog-panel.js` grows the logic to drive it alongside the new pagination behavior. `contentful-graphql.js` extends its queries to support filtered, paginated fetches.

## Code Project Content

**Date:** 2026-03-22 · **Commit:** `0743ac2` · **PR:** #2

A "Writes Code" panel joins the blog panel, backed by a new `js/code-panel.js` custom element and `css/panel-list.css` for the shared list layout both panels now use. `js/blog-intro-section.js` factors the blog panel's introductory copy into its own component, and `js/contentful-rich-text-html.js` adds a renderer for Contentful's rich text fields. `blog-panel.js` shrinks as list-view logic common to both panels moves into the shared files.

## Music Project Content

**Date:** 2026-03-23 · **Commit:** `04d9be4` · **PR:** #3

A "Makes Music" panel joins the site, driven by a new `js/music-panel.js` custom element. `contentful-graphql.js` gains the queries needed to fetch music project entries from Contentful.

## Moodboard Content, and a CSS Refactor

**Date:** 2026-03-24 · **Commit:** `e33d9f6` · **PR:** #4

A "Collects Moods" panel joins the site through a new `js/moodboard-panel.js` custom element and `css/moodboard-panel.css` stylesheet. Alongside it, shared panel styles move out of the growing `css/blog.css` and into two new dedicated files, `css/music-panel.css` and `css/panel-scroll.css`, cutting `blog.css` by roughly half.

## Desktop Blog Tweaks

**Date:** 2026-04-26 · **Commit:** `664f138` · **PR:** #5

`CLAUDE.md` appears for the first time, documenting the project's architecture and development commands for future work. `js/dev-mode.js` adds the `?dev-mode=` URL parameters that force a panel open during development, and `js/dropdown.js` is substantially reworked to support them alongside the coordinated open/close behavior between panels. `blog-panel.js` picks up further desktop-specific layout adjustments.

### Using dev mode

1. Append `?dev-mode=blog-list` or `?dev-mode=blog-article` to any URL.
2. Reload the page. The blog panel opens automatically and, in `blog-article` mode, loads its first article.

## Desktop Code Tweaks

**Date:** 2026-04-27 · **Commit:** `7e0f1fa` · **PR:** #6

The "Writes Code" panel's detail view moves to a new shared stylesheet, `css/panel-detail.css`, and gains its own `css/code.css` for panel-specific rules. `js/code-panel.js` is substantially reworked to match, and `js/dev-mode.js` extends to cover the code panel's own list and project dev modes.

## Expand Code Project Article View

**Date:** 2026-04-27 · **Commit:** `e844390` · **PR:** #7

The code project detail view expands, and the logic that tracks which article is currently open consolidates into `code-panel.js` rather than being split across files.

## Music Panel Layout Tweaks

**Date:** 2026-04-27 · **Commit:** `ea638ca` · **PR:** #8

`css/music-panel.css` is simplified, trimming its rule count while preserving the panel's layout. `js/dev-mode.js` extends to cover the music panel's dev modes.

## Desktop Moodboard Tweaks

**Date:** 2026-04-29 · **Commit:** `aca9dde` · **PR:** #9

The moodboard panel gains desktop-specific layout behavior in `js/moodboard-panel.js` and `css/moodboard-panel.css`, and `js/dev-mode.js` extends to cover its dev mode.

## Mobile Blog

**Date:** 2026-04-29 · **Commit:** `8779e79` · **PR:** #10

The blog panel's list and detail views gain mobile-specific layout rules across `css/blog.css`, `css/panel-list.css`, `css/panel-scroll.css`, and `css/fonts.css`. `dropdown.js` and `dropdown-image.js` pick up matching adjustments for smaller viewports.

## Mobile Music

**Date:** 2026-04-30 · **Commit:** `5e0883a` · **PR:** #11

The music panel gains mobile-specific layout rules in `css/music-panel.css`, and `js/music-panel.js` adjusts its rendering logic to match.

## Mobile Moodboard

**Date:** 2026-04-30 · **Commit:** `5dccdbe` · **PR:** #12

The moodboard panel's mobile layout receives further tweaks in `css/index.css` and `css/moodboard-panel.css`.

## Refactor: CSS Design Tokens and Custom Element Panels

**Date:** 2026-05-01 · **Commit:** `d99a667` · **PR:** #13

This refactor introduces the CSS custom-property color tokens (`--color-*`) that `css/reset.css` still defines today, and restructures each panel's markup and styling around them. `blog-panel.js` is rewritten almost line for line, and `js/blog-intro-section.js` is removed as its logic folds back into the blog panel. Every panel stylesheet adjusts to the new token system.

## Refactor 2: Utility Class System

**Date:** 2026-05-02 · **Commit:** `b257914` · **PR:** #14

`css/css-utils.css` is added, introducing the project's Tailwind-style utility class system for layout, spacing, and typography. `css/panel-detail.css` and `css/panel-list.css` are removed as their rules move into utility classes composed directly in HTML, and `accessible-select.js`, `blog-panel.js`, `code-panel.js`, `moodboard-panel.js`, and `music-panel.js` are all rewritten to use them. `.claude/agents/git-guru.md` is added as a development-tooling experiment.

## Refactor 3: Article Styles and Constants

**Date:** 2026-05-02 · **Commit:** `4d2f811` · **PR:** #15

`css/article.css` is split out to hold rich-text article body styles, cutting `css/blog.css` by roughly 250 lines, and `css/skeleton.css` adds shared loading-skeleton styles. `js/constants.js` centralizes values previously duplicated across panel files. `.claude/skills/css/SKILL.md` is added, documenting the utility class system and CSS rules this project enforces. `js/contentful-config.example.js` is removed in favor of environment-variable-based Contentful configuration.

## Refactor 4: Cleanup

**Date:** 2026-05-02 · **Commit:** `1bb2aff` · **PR:** #16

A small follow-up cleanup consolidates a few remaining rules into `css/css-utils.css` and simplifies `js/constants.js`, `js/code-panel.js`, and `js/music-panel.js`.

## Custom Scrollbars

**Date:** 2026-05-03 · **Commit:** `29bde9f` · **PR:** #17

`js/scrollbar.js` adds a custom scrollbar implementation, and `blog-panel.js` and `code-panel.js` adopt it in place of native scrollbars for their scrollable regions. `css/panel-scroll.css` and `css/reset.css` gain the supporting styles.

## Fixes, May 3

**Date:** 2026-05-03 · **Commit:** `f188716` · **PR:** #18

`css/index.css` is significantly trimmed, and `js/moodboard-panel.js` is simplified, removing logic no longer needed after the earlier refactors.

## Netlify Deployment Configuration

**Date:** 2026-05-03 · **Commit:** `ace5678` · **PR:** #19

`netlify.toml` configures the site for deployment on Netlify, and `netlify/functions/contentful-env.js` adds a serverless function that exposes the Contentful environment variables to the browser in production, mirroring the `/contentful-env.js` endpoint `serve.mjs` already serves in development.

## Meta, Share Image, and Favicon

**Date:** 2026-05-04 · **Commit:** `a5d14b2` · **PR:** #20

The site gains an SVG favicon, an Open Graph share image, and social meta tags in `index.html`. `js/video.js` is added as a new custom element for embedding video, and `dropdown-image.js` adjusts to accommodate it.

## Performance Fixes

**Date:** 2026-05-07 · **Commit:** `6af7aeb` · **PR:** #21

CSS delivery moves to a server-generated bundle: `netlify/functions/css-bundle.js` concatenates and minifies the files listed in `CSS_BUNDLE_FILES` at request time in production, and `serve.mjs` gains the equivalent development route at `/css/bundle.css`. `index.html` switches to loading that single bundled stylesheet instead of individual `<link>` tags. `assets/headshot.jpg` is replaced by a smaller `assets/share.jpg`.

### Adding a new stylesheet

1. Create the file in `css/`.
2. Add its filename to `CSS_BUNDLE_FILES` in both `serve.mjs` and `netlify/functions/css-bundle.js`, placing it after any file it depends on.

## Performance Fixes, Continued

**Date:** 2026-05-07 · **Commit:** `4dfc4d1` · **PR:** #22

A follow-up performance pass makes a small adjustment to `index.html` and `netlify.toml`.

## Video Captions and Accessibility

**Date:** 2026-05-09 · **Commit:** `27f17ea` · **PR:** #23

`js/video.js` gains a `description` attribute that renders as an accessible caption, and marks its decorative video element `aria-hidden` so screen readers announce the caption text instead of the video itself.

## Local Rich Text Rendering

**Date:** 2026-05-09 · **Commit:** `4cd7af8` · **PR:** #24

`js/contentful-rich-text-html.js` replaces its CDN-loaded rich text renderer with a local implementation, removing the runtime dependency on an external ESM import for rendering Contentful rich text fields. `blog-panel.js` and `code-panel.js` update their imports to match.

## 3D Assets

**Date:** 2026-05-11 · **Commit:** `c7f1ac7` · **PR:** #25

Two looping 3D-rendered video clips, `assets/saturn.webm` and `assets/ufo.webm`, replace the placeholder heart image and the original UFO video used earlier in the site.

## 3D Asset Fixes

**Date:** 2026-05-16 · **Commit:** `46b9f07` · **PR:** #26

`assets/saturn_split.webm` and `assets/ufo_split.webm` add split versions of the two 3D video clips, and `js/video.js` is substantially reworked to support them.

## First Test Release

**Date:** 2026-05-16 · **Commit:** `05df9c1` · **PR:** #28

`robots.txt` is added alongside a small set of fixes to `css/index.css`, `index.html`, and `js/video.js`, marking the site's first test release.

## Release: 404 Page, Design System Reference, and Mobile Dropdown Fix

**Date:** 2026-08-25 · **Commit:** `0371b71` · **PR:** #31

This release bundles several changes merged into `develop` since the last release. A `404.html` page, styled by a new `css/404.css`, now handles unknown routes instead of falling through to the home page. `design-system.html` and `css/design-system.css` add a living design system reference page, documenting the site's color tokens and typography scale and defining the `.type-*` classes now applied site-wide. The article detail panel switches to `100dvh` for its height calculation, fixing a reachability problem on mobile browsers where the dynamic toolbar previously clipped part of the panel. `js/credits.js` adds a short attribution message to the browser console.

## Release: Theme Toggle, Meta Tags, and Panel List Fixes

**Date:** 2026-08-26 · **Commit:** `26c512a` · **PR:** #36

This release adds a light/dark theme toggle: `js/theme-toggle.js` and `css/theme-toggle.css` implement the control, and `js/theme-init.js` applies the stored preference before first paint to avoid a flash of the wrong theme. `index.html` gains page title and description meta tags, and `netlify/edge-functions/og-image.js` extends substantially to generate a matching Open Graph share image. Panel list rows across the blog and code panels now match each other's height and are clickable across their full area, not just the link text. `README.md` and `.env.example` document the project for the first time.

## Release: Design System Diagnostic Fixes and Design-System-Ops Tooling

**Date:** 2026-08-31 · **Commit:** `df00486` · **PR:** #38

This release bundles a swapped share image (`assets/share-2.jpg` replaces `assets/share.jpg`) and a corrected 404 page "go home" button style with a larger addition: `.claude/skills/design-system-ops/`, a Claude Code skill for auditing design systems, is added to the repository's development tooling. Running that skill's diagnostics against this project surfaced a batch of fixes applied in the same release: semantic color tokens for each panel's trigger states, several raw typography declarations converted to the site's `.type-*` scale, a low-contrast focus-visible ring corrected for light mode, `--color-ink-6` changed to track the active theme's ink color via relative color syntax instead of a fixed light-mode value, and the site's opt-in-only dark mode behavior documented as an intentional product decision rather than an oversight. A late fix in the same release restores the distinct per-panel focus ring colors in light mode that an earlier fix in the batch had inadvertently unified.
