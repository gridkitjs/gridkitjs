# @gridkitjs/theme-tailwind

## 0.11.0

### Minor Changes

- 2980dcf: Secondary text now meets WCAG AA contrast (4.5:1) on group rows. The light `--gridkit-fg-muted-light` default is darker, `oklch(0.5 0.015 250)` where it was `oklch(0.55 0.015 250)`, so a group row's `(n)` count and inline subtotals, which sat at about 4.4:1 on `--gridkit-surface-muted` and 4.1:1 on hover, now read at 5.5:1 and 5:1. Every other use of `--gridkit-fg-muted` in light mode is slightly darker too. The dark palette already met AA and is unchanged. A grid that overrides `--gridkit-fg-muted` or its `-light` value keeps its own colour.

  `datasetIndex` is each row's position in the whole result as shown, as documented. A data row's `datasetIndex` used to stay at its index in `dataSource` through filtering, sorting and grouping, so in a grouped grid a group's first data row could share an `aria-rowindex` with the group row above it, and in a sorted or filtered grid `aria-rowindex` skipped about or ran past `aria-rowcount`. `filterRows`, `sortRows`, `groupRows` and `withGroupAggregates` now renumber `datasetIndex` alongside `rowIndex`, so every row, group row and summary row has its own `aria-rowindex`, in order, on every page and under virtualization. A `cellTemplate` that reads `datasetIndex` as a running row number now counts 1, 2, 3 down the grid however it is sorted; to reach a row's index in `dataSource`, look the row up by its id instead.

  `DataGrid`'s grand-total footer row, drawn while `aggregates` is set, has an `aria-rowindex` of its own, after the last body row, and is counted in the grid's `aria-rowcount`, which is one higher than before for a grid with aggregates. It had neither, so a screen reader could not place it among the rows.

  The built-in pager keeps keyboard focus at either end. Pressing Next until the last page used to disable the focused button and drop focus to the page; now First, Previous, Next and Last are disabled with `aria-disabled="true"` instead of the `disabled` attribute, so the button stays focused and announced as unavailable, and pressing it again does nothing. The theme styles `.grid-pager-button[aria-disabled="true"]`, fading the chevron but not the focus ring. **Breaking:** CSS or tests of your own that look for the buttons' `disabled` attribute no longer match; CSS that targets `.grid-pager-button:disabled` should target `.grid-pager-button[aria-disabled="true"]`:

  ```css
  /* Before */
  .grid-pager-button:disabled {
    opacity: 0.3;
  }
  /* After */
  .grid-pager-button[aria-disabled="true"] {
    opacity: 0.3;
  }
  ```

## 0.10.0

### Minor Changes

- 6a4c6c2: New `--gridkit-radius` token (default `0.25rem`) rounds the grid's outer frame and the pager bar's outer corners; the header and rows clip to it. Set `--gridkit-radius: 0` on `:root` or an ancestor of the grid to keep square corners.

### Patch Changes

- 6a4c6c2: The pager is styled as one connected bar: a shared hairline between segments, the radius on its outer corners only, the active page in the accent with a subtle ring, and every page-number slot the same width in tabular numerals, so the next and last buttons stay put from the first page to the last. The page-size control now sits beside the bar instead of at the pager's far end.
- 6a4c6c2: The grid's scroll regions (the viewport, the row area, menus, the column chooser and the filter checklist) now show thin scrollbars in the theme's muted colour, in light and dark. Only the grid's own elements are styled, never the page.

## 0.9.0

### Minor Changes

- 610d28a: Styles for the filter menu's excel editor. `.filter-menu-values` stacks its
  `.filter-menu-search` box, the `.filter-menu-select-all` checkbox and the
  `.filter-menu-checklist`, a fixed-height list that scrolls inside itself.
  Each value is a `.filter-menu-option` whose `.filter-menu-option-check` is
  drawn as a checkbox — filled with `--gridkit-accent` and ticked while
  `[aria-checked="true"]` — beside its `.filter-menu-option-label`, ending in an
  ellipsis when too long, and its muted `.filter-menu-option-count`. The muted
  `.filter-menu-search-first` note takes the list's box while it waits for a
  search, and `.filter-menu-more` sits under a list cut short.
- 1026158: Styles for the filter menu's simple editor. `.filter-menu-condition` puts a
  condition's `.filter-menu-operator` picker on a line of its own and its
  `.filter-menu-value` boxes on the next, a "Between"'s two halving it;
  `.filter-menu-combinator` lays out the And/Or radio buttons between the two
  conditions, and `.filter-menu-custom` is the muted "Custom filter" note. A
  value box marked `[aria-invalid="true"]`, and the `.filter-menu-invalid`
  message under the conditions, take `--gridkit-accent` turned red — no token
  names an error colour — over the text colour in a browser without relative
  colour syntax.
- 1026158: Styles for the column filter menu. `.header-filter-toggle`, a filterable
  header's funnel, sits at the header's end with the sort toggle moved beside
  it; it is hidden until the header is hovered or focused, and filled in accent
  while `.is-filtered`. `.gridkit-filter-menu` is the popup: a fixed-width
  panel like the column chooser, with its sort entries
  (`.filter-menu-sort-item`) drawn as menu items and its buttons
  (`.filter-menu-actions`) — "Clear filter" at the start, Cancel and a tinted
  OK at the end — in both palettes.
- 610d28a: Styles for the excel filter editor's operator submenu. `.filter-menu-submenu`,
  the "Number filters" button, is drawn as a menu item — shaded while its menu
  is open — with a `.filter-menu-submenu-icon` before its label, ticked in
  `--gridkit-accent` while the column is filtered by conditions, and a
  `.filter-menu-submenu-indicator` chevron at the end. `.filter-menu-back`,
  "Back to values" above a condition the submenu chose, is drawn the same, its
  `.filter-menu-back-icon` chevron before its label.
- 0119cd3: Printing the page with the browser's own print (Ctrl+P) now shows the grid as
  a plain table: an `@media print` block hides the toolbar, the group-by bar, the
  pager and the resize handles, lets a `height`-bound grid's drawn rows flow
  onto as many pages as they take, keeps header shading, and never splits a row
  across two pages. It prints only the rows the grid has drawn; the grid's own
  Print prints every row.

### Patch Changes

- bd78d43: The package manifests and READMEs now point at the repository's current home, `github.com/gridkitjs/gridkitjs`.

## 0.8.1

### Patch Changes

- 84c51ec: Dropped the `.header-resize-grip` rules; no component has rendered that element, so the stylesheet is smaller with nothing visible changed.

## 0.8.0

### Minor Changes

- 22cf630: Styles for the grid's column chooser, in both palettes: `.gridkit-column-chooser`,
  the panel; `.column-chooser-search`; `.column-chooser-option`, a checkbox and
  its label, muted while disabled; `.column-chooser-all`, the "Show all"
  checkbox set apart from the list; `.column-chooser-list`, which scrolls inside
  itself past about ten columns; and `.column-chooser-empty`. Like the menus, the
  chooser renders into `document.body`, so these selectors are top-level.
- 183babc: Styles for the grid's menus, in both palettes: `.gridkit-overlay`, the box a
  menu opens in, above the grid; `.gridkit-menu` and its items (`.menu-item`,
  with `.menu-item-icon`, `.menu-item-label`, `.menu-item-shortcut` and
  `.menu-submenu-indicator`), focused, disabled, checked and expanded through
  their ARIA attributes; and `.menu-separator`. Overlays render into
  `document.body`, so these selectors are top-level.
- 5f9a5da: Styles for the grid's toolbar, in both palettes: `.gridkit-toolbar`, sticky
  to the grid's start edge so it stays in view while the tables scroll
  sideways; `.toolbar-button` (with `.toolbar-button-icon` and
  `.toolbar-button-indicator`), disabled, pressed and expanded through their
  ARIA attributes; `.toolbar-more`, `.toolbar-search`, `.toolbar-separator`,
  `.toolbar-spacer` and `.toolbar-custom`.

### Patch Changes

- 66c2815: A long-press on a header, cell or group row that opens the grid's context menu
  no longer also brings up iOS's own callout, or starts selecting the text under
  the finger on a touch screen.
- 66c2815: The toolbar's "More" button can no longer be cut off: the search box narrows to
  at most half a narrow toolbar's width, and when the search box and custom
  entries alone are still wider than the toolbar, "More" sticks to its end edge.

## 0.7.0

### Minor Changes

- bedd76c: `.grid-loading-cell`: styles `@gridkitjs/react`'s new `infiniteScroll` loading row — centered, muted text, matching the grand-total footer's own cell padding. The row is `aria-hidden` and outside `aria-rowcount`, so this is a purely visual cue.
- bedd76c: `.gridkit-data-grid-body`: the row area's scroll container, styled to honor `@gridkitjs/react`'s new `height` prop (`overflow-y: auto`, height driven by the prop or `auto` when it's unset). No `position: sticky` is added for the header or footer — splitting them into their own tables already keeps them out of the region that scrolls, so there's nothing to stick. Add your own CSS targeting `.gridkit-data-grid-header`/`.gridkit-data-grid-footer` for a divider or shadow at the seam.

## 0.6.0

### Minor Changes

- 6e8189b: Styles for aggregates (`@gridkitjs/react`'s new `aggregates` prop): `.group-aggregates`/`.group-aggregate` for a group header's inline subtotal (`groupAggregateDisplay: "inline"`), `.grid-group-summary-row`/`.grid-group-summary-cell` for a group's own summary row (`groupAggregateDisplay: "row"`), and `.grid-footer`/`.grid-footer-cell` for the grand-total footer — including each one's `borders-*` variants.
- 6e8189b: Styles for the built-in pager's numbered variant (`@gridkitjs/react`'s `pager.variant: "numbered"`): `.grid-pager-button[aria-current="page"]` for the active page, and `.grid-pager-ellipsis`.
- 6e8189b: Styles for the new built-in pager (`@gridkitjs/react`'s `paginated` prop): `.gridkit-grid-pager`, `.grid-pager-button`, `.grid-pager-status`, and `.grid-pager-page-size`.

## 0.5.0

### Minor Changes

- 388def3: Styles for dragging a header into the group-by bar and reordering its chips:
  drop indicators on chips, a dashed drag-target outline on the bar itself, a
  `not-allowed` cursor and muted outline for a header already in the group-by
  stack dragged back toward it, a grab cursor and drag ghost for chips, and an
  empty-bar placeholder shown only when at least one column is draggable into
  it.
- 388def3: Styles for `@gridkitjs/react`'s new row grouping: the group header row, its
  expand/collapse toggle, each groupable column header's group icon, and the
  group-by bar and its removable chips.

## 0.4.0

### Minor Changes

- a01c851: The stylesheet no longer registers its own `@custom-variant dark` — it now
  follows whatever `dark:` variant your app's own Tailwind build already
  resolves to, so it never conflicts with an app that configures its own
  (a class, a `data-` attribute, or anything else). Out of the box, with
  nothing customized, a grid now follows the OS `prefers-color-scheme`
  instead of a `.dark` class.

  To keep the previous class-toggle behavior, declare it yourself, same as any
  Tailwind v4 app would:

  ```css
  @import "tailwindcss";
  @custom-variant dark (&:where(.dark, .dark *));
  @import "@gridkitjs/theme-tailwind/styles.css";
  ```

  Also new: `.gridkit-light` / `.gridkit-dark`, which pin a grid to one palette
  regardless of the ambient `dark:` state. Put either on any ancestor of the
  grid, including the grid's own root, to force a single grid's theme
  independent of the app around it.

## 0.3.2

### Patch Changes

- 29f2c39: The last row's cells no longer draw a bottom border under `borders-horizontal` or `borders-all` — previously it rendered as a stray extra edge below the table.

## 0.3.1

### Patch Changes

- 26adc6f: Added multi-column stacked sorting. A header's sort toggle cycles a column
  through ascending, descending, and off; Shift-click adds or updates a column
  in the stack instead of replacing it, sorted in priority order. Configure
  with `sortableColumns` / `column.sortable`, seed with `defaultColumnSort`,
  and listen with `onColumnSortChange`.

## 0.3.0

### Minor Changes

- f30a2a9: A focus ring on the focused header or body cell, drawn in `--gridkit-accent`.
  The grid is one tab stop with the arrow keys moving within it, so the ring is
  the only sign of where that stop is.

  Two new hooks for the styles to target: `.gridkit-sr-only`, which hides the
  grid's live region visually while leaving it in the accessibility tree, and
  `.header-cell.is-reorderable` for the grab affordance — every header is
  focusable now, so a `tabindex` no longer picks out the ones that drag.

- 4a92413: Styles for a selected row, column or cell, on two new palette tokens:
  `--gridkit-selected`, and `--gridkit-selected-strong` for one that is also
  hovered — hover already claims `--gridkit-surface-muted`, so without a second
  token a selected row would lose its highlight under the pointer.

  New classes the stylesheet targets: `is-selected` on a row, header cell or body
  cell, and `selectable-rows` / `selectable-columns` / `selectable-cells` on the
  grid itself. The last three enable rather than disable, the opposite of
  `no-hover-*` — hover is on by default and selection is off, so each class
  follows its own default.

  A grid that opts into row or cell selection also stops its cells' text being
  drag-selected, or a Shift-click meant to take a range of rows would smear the
  browser's own highlight across every cell it crossed.

## 0.2.3

### Patch Changes

- a157b54: Fixed `borders="all"` still drawing a left-edge line on the first column. The table-level `box-shadow` meant to repaint that stripped edge didn't align with `border-collapse: collapse` and left a stray line behind; the outer left/right edges are now simply left unset on the first/last cell, with nothing repainting them.

## 0.2.2

### Patch Changes

- 7dcffc9: A column with `wrap` enabled now breaks a word longer than the column instead
  of overflowing it — `white-space: normal` alone only breaks at spaces, so a
  long unbroken token (a URL, a long identifier) previously spilled past the
  column's fixed width.

## 0.2.1

### Patch Changes

- 76c62b1: Fix the grid overflowing its viewport by 1px under `borders="all"`. The first
  column's left border had no neighbour to collapse with, so it added a pixel
  the width calculations didn't account for — under `resizeMode="fit"` this
  clipped the last column's border and, in narrow layouts, its content.

## 0.2.0

### Minor Changes

- 1e112a6: Styles the new `is-wrapped` state `@gridkitjs/react` adds for a column with
  `wrap.header`/`wrap.cells` set: `overflow: visible`, `text-overflow: clip`,
  and `white-space: normal` in place of the grid's default single-line
  ellipsis, on just that column's header and/or cells.

## 0.1.0

### Minor Changes

- 7f0645b: Styles for column reordering. A header being dragged goes half-opaque and a
  copy of it trails the pointer, while the gap the column would drop into takes
  an accent line — drawn on the leading edge of the column after the gap, or the
  trailing edge of the last one. A reorderable header also takes a `grab` cursor
  and stops its label being selected mid-drag.
