---
"@gridkitjs/theme-tailwind": minor
---

New theme tokens for the grid's colours and type. Each defaults to the look
the grid already has, so nothing changes until you override one on `:root`,
in a stylesheet loaded after the theme.

- Colours, each a `-light`/`-dark` pair like the palette's
  (`--gridkit-header-bg-light`, `--gridkit-header-bg-dark`):
  `--gridkit-header-bg`, `--gridkit-header-fg`, `--gridkit-group-row-bg`,
  `--gridkit-row-hover-bg`, `--gridkit-row-stripe-bg` (transparent, so rows
  are striped only once you set it), `--gridkit-focus-ring`,
  `--gridkit-accent-fg`, `--gridkit-error`, `--gridkit-scrollbar-thumb` and
  `--gridkit-overlay-shadow-color`. Each is a Tailwind colour too, such as
  `bg-gridkit-header-bg`.
- Type: `--gridkit-font-family` and `--gridkit-font-size` for the grid's
  text; `--gridkit-menu-font-size`, `--gridkit-bar-font-size` (the toolbar,
  group-by bar and pager) and `--gridkit-hint-font-size` for its smaller
  text; `--gridkit-header-font-weight`, `--gridkit-header-text-transform` and
  `--gridkit-header-letter-spacing` for header labels;
  `--gridkit-group-font-weight` for group labels and totals; and
  `--gridkit-font-variant-numeric`, which `tabular-nums` sets to line numbers
  up in their columns.

```css
:root {
  --gridkit-font-family: "Inter", sans-serif;
  --gridkit-header-text-transform: uppercase;
  --gridkit-row-stripe-bg-light: oklch(0.985 0.002 250);
  --gridkit-row-stripe-bg-dark: oklch(0.24 0.011 250);
}
```

Breaking if your theme overrides a palette colour by its live name on
`:root`, such as `--gridkit-accent`: the parts these tokens now set default
to the palette colour's light and dark pair, so they no longer follow the
live name. That covers focus rings and the error colour (`--gridkit-accent`),
the header background and the tick on an accent fill (`--gridkit-surface`),
group rows and row hover (`--gridkit-surface-muted`) and the scrollbar thumb
(`--gridkit-fg-muted`). Override the pair instead, which reaches them all
and grids pinned with `.gridkit-light` or `.gridkit-dark` too:

```css
/* Before */
:root {
  --gridkit-accent: oklch(0.6 0.17 145);
}

/* After */
:root {
  --gridkit-accent-light: oklch(0.6 0.17 145);
  --gridkit-accent-dark: oklch(0.7 0.15 145);
}
```
