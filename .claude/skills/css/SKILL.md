---
description: CSS conventions and rules for this project. Use when writing, editing, or reviewing any CSS — including utility class usage, shadow DOM component styles, breakpoints, and enforced rules.
---

# CSS Architecture

## Composable utility classes (default approach)

Prefer composable utility classes over component-specific CSS. Common utilities (typography, spacing, layout, visibility, etc.) live in shared CSS files and are composed directly in HTML. Only write a new rule in a component stylesheet when a utility class cannot do the job — for example, when you need higher specificity to override a base style, or when the style is truly unique to one component and has no reuse value.

## Shadow DOM components

Web components that use shadow DOM (e.g. `ImageElement`, `AccessibleSelect`) are isolated from the global stylesheet — global utility classes do not pierce the shadow boundary. These components must include their own `<style>` block inside `connectedCallback` (or equivalent) that defines all styles they need, including any values that mirror global custom properties (`--color-*`, etc.) via `:host` or inherited properties.

## Breakpoints

- Mobile: anything under 767px wide
- Desktop: 768px and above (`@media (min-width: 768px)`)

CSS files are mobile-first: base styles (no media query) target mobile; desktop overrides go at the bottom of the file inside `@media (min-width: 768px)` blocks.

## Rules (enforced)

- Use relative units (`rem`, `em`, `%`, `vw`, `vh`, `clamp()`) — `px` is only acceptable for `1px` hairline borders
- Do not add `box-sizing: border-box` anywhere — the global reset in `css/reset.css` already sets it for all elements
- Never add `text-decoration` to `.panel-list__button`
- Prefer unitless values for `line-height` and `font-weight`
- If a `px` exception is truly necessary, add a comment explaining why
