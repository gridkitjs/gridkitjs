# @gridkitjs/theme-css

Plain-CSS theme for [GridKit](https://github.com/gridkitjs/gridkitjs) —
palette tokens, dark mode and the grid's styles, for an app without
Tailwind. It is generated from
[`@gridkitjs/theme-tailwind`](https://www.npmjs.com/package/@gridkitjs/theme-tailwind),
so both draw the same grid.

> **Early development.** The API is still moving and may break between minor
> versions.

```bash
pnpm add @gridkitjs/theme-css
```

Import it once, before your own CSS:

```css
@import "@gridkitjs/theme-css/styles.css";
```

`@gridkitjs/react` renders semantic class names (`gridkit-data-grid`,
`gridkit-header-cell`, `gridkit-grid-row`), and this stylesheet targets them directly.

## Dark mode

The grid follows the system's colour scheme (`prefers-color-scheme`). An app
with its own light and dark switch puts `.gridkit-light` or `.gridkit-dark`
on `<html>`, or on any ancestor of one grid to pin that grid alone:

```js
document.documentElement.classList.toggle("gridkit-dark", isDark);
document.documentElement.classList.toggle("gridkit-light", !isDark);
```

## Theming

Every colour, size and line is a `--gridkit-*` custom property. Override the
ones you change on `:root`, after the import; a colour is set by its light
and dark pair:

```css
:root {
  --gridkit-spacing: 0.1875rem;
  --gridkit-accent-light: oklch(0.6 0.17 145);
  --gridkit-accent-dark: oklch(0.7 0.15 145);
}
```

Every token and its default is listed at
[gridkitjs.com](https://gridkitjs.com/en/docs/theme-tailwind/tokens).

## License

MIT © Blagoja Blazhevski
