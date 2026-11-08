---
"@gridkitjs/theme-tailwind": minor
---

Breaking: the palette's Tailwind colours carry a `gridkit-` prefix, so they
no longer claim names like `accent` or `surface` in your app's own theme.
Rename each use in your classes: `bg-accent` becomes `bg-gridkit-accent`,
`text-fg-muted` becomes `text-gridkit-fg-muted`. The unprefixed names are no
longer registered.

The nine colours are `gridkit-surface`, `gridkit-surface-muted`,
`gridkit-line`, `gridkit-hover-line`, `gridkit-fg`, `gridkit-fg-muted`,
`gridkit-accent`, `gridkit-selected` and `gridkit-selected-strong`.
`gridkit-hover-line` is new. The `--gridkit-*` custom properties are
unchanged.
