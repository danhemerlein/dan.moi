---
name: css
description: CSS conventions and rules for this project. Use when writing, editing, or reviewing any CSS — including utility class usage, shadow DOM component styles, breakpoints, and enforced rules.
---

# CSS Architecture

## When to use this skill

Invoke this skill any time you are writing or editing HTML or CSS in this project. The utility class system and enforced rules below apply to all HTML templates and stylesheets.

## Composable utility classes (default approach)

Prefer composable utility classes over component-specific CSS. Utility classes live in `css/css-utils.css` and are composed directly in HTML. Only write a new rule in a component stylesheet when no utility can do the job — for example, when you need a unique value not in the scale, a complex selector, or a property not covered by any utility.

**Available utility classes** (from `css/css-utils.css`):

| Class | Property |
|---|---|
| `.flex` | `display: flex` |
| `.flex-col` | `flex-direction: column` |
| `.flex-row` | `flex-direction: row` |
| `.flex-1` | `flex: 1 1 auto` |
| `.flex-shrink-0` | `flex-shrink: 0` |
| `.flex-wrap` | `flex-wrap: wrap` |
| `.flex-nowrap` | `flex-wrap: nowrap` |
| `.items-center` | `align-items: center` |
| `.items-baseline` | `align-items: baseline` |
| `.justify-center` | `justify-content: center` |
| `.justify-between` | `justify-content: space-between` |
| `.gap-0` | `gap: 0` |
| `.gap-1` | `gap: 0.25rem` |
| `.gap-2` | `gap: 0.5rem` |
| `.gap-3` | `gap: 0.75rem` |
| `.gap-4` | `gap: 1rem` |
| `.m-0` | `margin: 0` |
| `.mt-2` | `margin-top: 0.5rem` |
| `.mx-auto` | `margin-left/right: auto` |
| `.ml-auto` | `margin-left: auto` |
| `.p-0` | `padding: 0` |
| `.w-full` | `width: 100%` |
| `.w-auto` | `width: auto` |
| `.h-full` | `height: 100%` |
| `.h-auto` | `height: auto` |
| `.max-w-full` | `max-width: 100%` |
| `.min-w-0` | `min-width: 0` |
| `.min-h-0` | `min-height: 0` |
| `.overflow-hidden` | `overflow: hidden` |
| `.object-cover` | `object-fit: cover` |
| `.rounded-sm` | `border-radius: 0.35rem` |
| `.block` | `display: block` |
| `.grid` | `display: grid` |
| `.hidden` | `display: none` |
| `.uppercase` | `text-transform: uppercase` |
| `.lowercase` | `text-transform: lowercase` |
| `.text-center` | `text-align: center` |
| `.text-left` | `text-align: left` |
| `.text-right` | `text-align: right` |
| `.font-normal` | `font-weight: 400` |
| `.font-style-normal` | `font-style: normal` |
| `.align-middle` | `vertical-align: middle` |
| `.list-none` | `list-style: none` |
| `.cursor-pointer` | `cursor: pointer` |
| `.pointer-events-none` | `pointer-events: none` |

**Responsive variants** (apply at `min-width: 768px`):

| Class | Property |
|---|---|
| `.lg-flex` | `display: flex` |
| `.lg-flex-col` | `flex-direction: column` |
| `.lg-flex-row` | `flex-direction: row` |
| `.lg-block` | `display: block` |
| `.lg-hidden` | `display: none` |
| `.lg-gap-2` | `gap: 0.5rem` |

## Shadow DOM components

Web components that use shadow DOM (e.g. `ImageElement`, `AccessibleSelect`) are isolated from the global stylesheet — global utility classes do not pierce the shadow boundary. These components must include their own `<style>` block inside `connectedCallback` (or equivalent) that defines all styles they need, including any values that mirror global custom properties (`--color-*`, etc.) via `:host` or inherited properties.

## Breakpoints

- Mobile: anything under 767px wide
- Desktop: 768px and above (`@media (min-width: 768px)`)

CSS files are mobile-first: base styles (no media query) target mobile; desktop overrides go at the bottom of the file inside `@media (min-width: 768px)` blocks.

## Bundling and minification

All CSS files are concatenated and minified at request time — no physical bundle file exists in the repo. The individual files in `css/` are the source of truth.

**Dev:** `serve.mjs` serves `/css/bundle.css` by reading and concatenating the files listed in `CSS_BUNDLE_FILES` (in order), then running them through `minifyCSS`.

**Production (Netlify):** `netlify/functions/css-bundle.js` does the same, routed via the `/css/bundle.css` redirect in `netlify.toml`.

`index.html` loads only `/css/bundle.css` — do not add individual `<link>` tags for CSS files there.

When adding a new CSS file:
1. Create it in `css/`
2. Add its filename to `CSS_BUNDLE_FILES` in both `serve.mjs` and `netlify/functions/css-bundle.js` (order matters — put it after any files it depends on)

The `minifyCSS` function strips comments, collapses whitespace, removes spaces around `{ } ; : , > ~ +`, and drops trailing semicolons. Avoid patterns it can't handle safely: whitespace inside `content` strings with multiple spaces, or comments used as IE hacks.

## Rules (enforced)

- Use relative units (`rem`, `em`, `%`, `vw`, `vh`, `clamp()`) — `px` is only acceptable for `1px` hairline borders
- Do not add `box-sizing: border-box` anywhere — the global reset in `css/reset.css` already sets it for all elements
- Never add `text-decoration` to `.panel-list__button`
- Prefer unitless values for `line-height` and `font-weight`
- If a `px` exception is truly necessary, add a comment explaining why
