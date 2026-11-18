# @gridkitjs/theme-css

## 0.3.0

### Minor Changes

- e4bb289: Each cell draws its own borders: the grid's tables use `border-collapse:
separate` with `border-spacing: 0`, where they used `border-collapse:
collapse`. Lines stay where they were, and column positions and widths are
  unchanged, but a body row under `borders="horizontal"` or `"all"` is half a
  pixel taller (41px where it was 40.5px at the default sizes), as the whole
  row line now sits inside the row.

  Custom CSS that draws a border on every side of every cell now shows doubled
  lines between cells, since two neighbouring cells no longer share one. Draw
  each seam from one side, as the theme does: a `border-bottom` for the line
  between rows and a `border-inline-end` for the line between columns, leaving
  out the last row and the last column.

- c32ea0d: Breaking: the header, the rows and the footer scroll in one element,
  `.gridkit-data-grid-tables`, both up and down and sideways, with the header
  and footer stuck to its top and bottom. Before, `.gridkit-data-grid-body`
  scrolled the rows up and down under `height`, and
  `.gridkit-data-grid-viewport`, which `DataGridApi.element` returns, scrolled
  the tables sideways. No class, `data-gridkit-*` attribute or ARIA role moves,
  and `element` and `table` are the same elements, but code that reads or sets
  a scroll position, or listens for `scroll`, on the body or the viewport now
  addresses `.gridkit-data-grid-tables`:

  ```ts
  // before
  grid.querySelector(".gridkit-data-grid-body").scrollTop = 0;
  api.element.scrollLeft = 0;

  // after
  const tables = grid.querySelector(".gridkit-data-grid-tables");
  tables.scrollTop = 0;
  tables.scrollLeft = 0;
  ```

  `--gridkit-body-height`, which `height` sets, is set on
  `.gridkit-data-grid-tables` in place of `.gridkit-data-grid-body`; CSS that
  sets it itself sets it there.

  This fixes a grid wider than its container putting its column titles over the
  wrong columns. The rows scrolled sideways on their own, without the header and
  footer, on a horizontal wheel or trackpad over them, a swipe, or keyboard
  focus moving to a column out of view, and scrolling the grid sideways by its
  scrollbar cut the rows off at the container's width. Now the header, rows and
  footer stay in line however the scroll starts, in left-to-right and
  right-to-left pages, with or without `height`. Under `height` the vertical
  scrollbar stays at the grid's visible edge wherever it is scrolled sideways.

  What stays the same: `height` bounds the rows alone, as the scroll area grows
  by the header's and footer's measured heights (a server-rendered grid shows the
  rows that much shorter until it hydrates); the toolbar, group-by bar and pager
  stay where they are; keyboard focus and `scrollToRow` bring a row into view
  clear of the header and footer; and the browser's print of the page is
  unchanged. Under `resizeMode: "fit"` the columns fill the scroll area, so a
  vertical scrollbar no longer makes them overflow sideways by its width.

  `@gridkitjs/dom`: `observeElementHeight` reports an element's height as it
  changes. `measurePageSize(bodyTable, scrollElement?)` takes the element the
  rows scroll in and leaves out their block `scroll-margin`. `createGridFocus`
  scrolls a body cell that focus leaves partly in view the rest of the way
  (`block` and `inline` `"nearest"`). `createRowVirtualizer` works on a scroll
  element whose rows follow a header stuck to its top.

- f502536: Dragging a header shows where it can go when columns are pinned. A column
  only moves within its pin group, and the drop line, the drop, the keyboard
  move and its announcement now agree with that:

  - `ColumnDropContext` takes an optional `pinOf(columnId)`, the edge each
    column is pinned to. With it, `resolveColumnDropTarget` returns `null` over
    a header in another pin group, and only targets that would move the column
    within its own group.
  - While a header is dragged, the headers of the other pin groups carry
    `is-drag-blocked`, which the theme draws with a muted label and a
    `not-allowed` cursor. The gap at the end of a group is marked
    `is-drop-after` on its last header rather than `is-drop-before` on the next
    group's first.
  - Ctrl+Arrow on a header at its group's edge does
    nothing; it announced a move that never happened. A move within a group
    announces the column's position on screen.

- a39e9d6: The grid's stylesheet mirrors in a right-to-left page. Under `dir="rtl"`,
  column borders, the resize handle, the sort and filter toggles, the group
  toggle's spacing, the resize and drop lines and the group-by bar's drop
  marks sit on the mirrored side, and the group row's triangle and the menus'
  submenu and back chevrons point the other way. The grid follows the `dir`
  attribute it inherits; setting only the CSS `direction` property mirrors the
  layout but not the lines and chevrons, which use `:dir(rtl)`. Left-to-right
  pages are unaffected: they render exactly as before.
- e4bb289: The stylesheet draws pinned columns. A cell marked `is-pinned-start` or
  `is-pinned-end` sticks to that edge of `.gridkit-data-grid-tables` at the
  `--gridkit-pin-offset` it carries, in the header, the rows, the footer and
  group summary rows, while the other columns scroll under it. Pinned cells are
  opaque in every row state: they show their row's colour (stripe, hover,
  selection, group summary, header, footer, or a class of your own) over the
  surface colour, never the cells scrolled underneath; a row's background image
  does not carry into them. The `is-pinned-edge` cell beside the scrolling
  columns draws a divider in `--gridkit-line`, under any `borders` setting, and
  the column before the end divider leaves out its own line so the two never
  double, even with no column left between the two edges. Printing the page puts pinned columns back in their own places.

  A group row's label now sticks to the start edge in every grid, so it stays
  in view however far a wide grouped grid scrolls sideways.

### Patch Changes

- f502536: A cell that keyboard focus moves to, or that `scrollToColumn` scrolls to, is
  no longer left partly under a pinned column. The stylesheet gives every
  unpinned header and body cell a `scroll-margin-inline` of the pinned columns'
  widths at each edge, and `createGridFocus` now scrolls a header cell to the
  `nearest` edge after a key moves focus to it, as it already did for body
  cells; Chromium and WebKit left a header cell where focus found it.
- 7b62693: A header's sort, filter and group toggles can be found and tapped on a touch
  screen. On a screen that cannot hover (`hover: none`) they show at rest, where
  before they appeared only on hover or keyboard focus. On a coarse pointer
  (`pointer: coarse`) each toggle and the resize handle take a 24 by 24 pixel
  target, the toggles sit side by side clear of the handle, and the label keeps
  clear of the toggles. Desktop rendering is unchanged.

## 0.2.0

### Minor Changes

- f7250e8: Breaking: every class name the grid renders starts with `gridkit-`, so the theme's rules can no longer match a host page's own elements and a host's rules no longer reach into the grid. The rest of each name is unchanged (`grid-row` is `gridkit-grid-row`, `header-cell` is `gridkit-header-cell`, `borders-all` is `gridkit-borders-all`), and the `is-*` state classes keep their names. Names that already started with `gridkit-` are unchanged too. Custom CSS and test selectors that name a grid class add the prefix:

  ```css
  /* Before */
  .grid-row.is-overdue {
    color: red;
  }

  /* After */
  .gridkit-grid-row.is-overdue {
    color: red;
  }
  ```

  ```ts
  // Before
  page.locator(".header-cell.is-selected");

  // After
  page.locator(".gridkit-header-cell.is-selected");
  ```

  The print document and the HTML table `@gridkitjs/core` writes for copy and print follow the same rule: `export-group`, `export-group-summary`, `print-title`, `print-subtitle` and `print-timestamp` are `gridkit-export-group`, `gridkit-export-group-summary`, `gridkit-print-title`, `gridkit-print-subtitle` and `gridkit-print-timestamp`, and `printStyles` from `@gridkitjs/dom` targets them.

## 0.1.0

### Minor Changes

- 432b82f: Theme presets: ready-made themes you import after the stylesheet to restyle
  the grid, its menus included, in one line. They are the same files
  `@gridkitjs/theme-tailwind` ships.

  ```css
  @import "@gridkitjs/theme-css/styles.css";
  @import "@gridkitjs/theme-css/presets/spreadsheet.css";
  ```

  Each preset sets theme tokens on `:root` and nothing else, in light and dark
  mode: `spreadsheet.css`, `comfortable.css`, `high-contrast.css` and
  `midnight.css`. `default.css` sets every token to its default, as a template
  to copy for a theme of your own: change what you want, and delete the lines
  you keep. `@gridkitjs/theme-css/presets/index.json` lists the presets with an
  `id`, `label`, `description` and `file` each, for tools that offer a choice
  of them.

- 680515a: New package: `@gridkitjs/theme-css`, the grid's stylesheet as plain CSS for
  apps without Tailwind. It is generated from `@gridkitjs/theme-tailwind`, so
  it has the same rules, theme tokens, defaults and class names. Import it
  once, before your own CSS:

  ```css
  @import "@gridkitjs/theme-css/styles.css";
  ```

  Dark mode follows `prefers-color-scheme`. An app with its own theme switch
  puts `.gridkit-light` or `.gridkit-dark` on `<html>`, or on any ancestor of
  a grid, to override it.

### Patch Changes

- 680515a: The grid no longer relies on Tailwind's Preflight. It sets
  `box-sizing: border-box` on itself, its menus and its drag ghosts, and its
  buttons and inputs take the surrounding font, so it draws the same in an app
  with Preflight turned off. With Preflight on, nothing changes.
