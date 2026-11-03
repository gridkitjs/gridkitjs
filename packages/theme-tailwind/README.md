# @gridkitjs/theme-tailwind

Tailwind v4 theme for [GridKit](https://github.com/blagojablazhevski/gridkit) —
palette tokens, dark mode and the grid's styles.

> **Early development.** The API is still moving and may break between minor
> versions.

```bash
pnpm add @gridkitjs/theme-tailwind
```

Import it after Tailwind, in the stylesheet where you import `tailwindcss`:

```css
@import "tailwindcss";
@import "@gridkitjs/theme-tailwind/styles.css";
```

That is all — `@gridkitjs/react` renders semantic class names
(`gridkit-data-grid`, `header-cell`, `grid-row`), and this stylesheet targets
them directly. Nothing needs to scan the component source.

## Dark mode

GridKit doesn't register its own `dark:` variant — it follows whatever your
app's Tailwind build already resolves `dark:` to. Out of the box that's the
OS preference. For the common class-toggle pattern, declare it yourself,
same as any Tailwind v4 app would:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@import "@gridkitjs/theme-tailwind/styles.css";
```

```js
document.documentElement.classList.toggle("dark", isDark);
```

### Forcing a theme on one grid

`.gridkit-light` / `.gridkit-dark` pin a grid to one palette regardless of
the ambient `dark:` state. Put either on any ancestor of the grid, including
the grid's own root:

```tsx
<div className="gridkit-dark">
  <DataGrid ... />
</div>
```

## Theming

Every colour is a CSS custom property, so overriding one is plain CSS — no
Tailwind config:

```css
:root {
  --gridkit-accent: oklch(0.6 0.17 145);
  --gridkit-line: oklch(0.9 0.01 145);
}
```

| Token                       | What it colours                                                          |
| --------------------------- | ------------------------------------------------------------------------ |
| `--gridkit-surface`         | Header background                                                        |
| `--gridkit-surface-muted`   | Hover background                                                         |
| `--gridkit-line`            | Borders                                                                  |
| `--gridkit-hover-line`      | Cell hover outline, resize edge                                          |
| `--gridkit-fg`              | Text                                                                     |
| `--gridkit-fg-muted`        | Secondary text and icons                                                 |
| `--gridkit-accent`          | Focus rings, drop indicators, and the active sort, group and check marks |
| `--gridkit-selected`        | Selected row, column or cell                                             |
| `--gridkit-selected-strong` | A selected row or cell also hovered                                      |

Redefine them inside `@variant dark { }` (or under `.gridkit-dark`) to change
the dark palette too:

```css
:root {
  --gridkit-accent: oklch(0.6 0.17 145);

  @variant dark {
    --gridkit-accent: oklch(0.7 0.15 145);
  }
}
```

`--gridkit-selected-strong` earns its place because hover already claims
`--gridkit-surface-muted`: with one token a selected row would lose its
highlight under the pointer.

## State classes

The grid marks its own state, so a consumer's CSS can reach it too:

| Class                                                         | On                                                                                            |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `is-selected`                                                 | A selected `grid-row`, `header-cell` or `grid-cell`                                           |
| `is-resizing` / `is-dragging`                                 | The column being resized or dragged                                                           |
| `is-drop-before` / `is-drop-after`                            | Where a dragged column would land                                                             |
| `is-reorderable` / `is-wrapped`                               | A header that drags; a cell that wraps                                                        |
| `selectable-rows` / `selectable-columns` / `selectable-cells` | On the grid, per `selectable`                                                                 |
| `no-hover-rows` / `no-hover-columns` / `no-hover-cells`       | On the grid, per `hoverable`                                                                  |
| `is-sorted-asc` / `is-sorted-desc`                            | A header's `header-sort-toggle` while its column sorts                                        |
| `is-grouped`                                                  | A header's `header-group-toggle` while its column is grouped                                  |
| `is-expanded`                                                 | A group row's `group-toggle` while the group is open                                          |
| `is-drag-target` / `is-drag-blocked`                          | The group-by bar while a drag can drop on it; while a header already grouped is dragged at it |

The `selectable-*` classes enable and the `no-hover-*` classes disable, because
selection is off by default and hover is on — each follows its own default.

The toolbar (`gridkit-toolbar`), the overlay around every menu and panel
(`gridkit-overlay`), menus (`gridkit-menu`) and the column chooser
(`gridkit-column-chooser`) mark their state with ARIA attributes rather than
classes — `aria-disabled`, `aria-pressed`, `aria-checked`, `aria-expanded` —
and the stylesheet targets those. An overlay renders into `document.body` and
carries the grid's `gridkit-light`/`gridkit-dark`, so its selectors are
top-level, not under `gridkit-data-grid`.

## License

MIT © Blagoja Blazhevski
