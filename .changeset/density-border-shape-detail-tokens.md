---
"@gridkitjs/theme-tailwind": minor
---

New theme tokens for the grid's spacing, lines, corners and details. Each
defaults to the look the grid already has, so nothing changes until you
override one on `:root`, in a stylesheet loaded after the theme.

- Density: `--gridkit-spacing` (`0.25rem`) is the unit every padding, gap and
  control height is a multiple of, so changing it alone makes the whole grid
  denser or roomier. `--gridkit-cell-padding-x` and `-y`,
  `--gridkit-header-padding-x` and `-y` (the cells' by default),
  `--gridkit-toolbar-padding`, `--gridkit-group-by-bar-padding`,
  `--gridkit-pager-padding` and `--gridkit-menu-item-padding-x` and `-y` set
  one part's padding on its own.
- Borders: `--gridkit-border-width` for every line the grid draws;
  `--gridkit-border-style` (`solid`, `dashed` or `dotted`) for the lines in
  and around the grid; `--gridkit-row-line-width` and
  `--gridkit-column-line-width`, which `0` turns off where the `borders`
  setting draws them; and `--gridkit-outer-border-width`, a border around the
  whole grid, `0` by default.
- Shape: `--gridkit-menu-radius` for menus, the column chooser and the filter
  menu, and `--gridkit-control-radius` for buttons, fields and options, beside
  the existing `--gridkit-radius`.
- Details: `--gridkit-icon-size`, `--gridkit-header-icon-size`,
  `--gridkit-focus-ring-width`, `--gridkit-indicator-width` (the resize and
  drop lines), `--gridkit-overlay-shadow` (the shadow's offsets and blur;
  its colour is `--gridkit-overlay-shadow-color`), `--gridkit-menu-min-width`,
  `--gridkit-column-chooser-width`, `--gridkit-column-chooser-max-height`,
  `--gridkit-filter-menu-width`, `--gridkit-filter-checklist-height` and
  `--gridkit-transition-duration`.

```css
:root {
  --gridkit-spacing: 0.1875rem;
  --gridkit-column-line-width: 0;
  --gridkit-outer-border-width: 1px;
  --gridkit-control-radius: 0;
}
```
