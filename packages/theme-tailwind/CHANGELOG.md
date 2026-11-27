# @gridkitjs/theme-tailwind

## 0.16.0

### Minor Changes

- eccea69: `forms.css` styles the forms packages' fields: a label above, beside
  (`--gridkit-forms-label-width`, 10rem by default), visually hidden or
  floating inside the control until it rises onto its top border, the
  required and optional markers, the description, and messages whose icon
  takes the colour of their severity while their text keeps the body colour.
  A floating label rests without a transition under
  `prefers-reduced-motion`. The rules live in `@layer base`, scoped to
  `.gridkit-forms-*` classes.
- 1ca833f: `forms.css` has a second look for a floating label: under the class
  `gridkit-forms-floating-above`, on a field or on any element around it
  (`<html>`, a form, a section), a raised label sits above the control, full
  size and in line with its inline start, where a top label sits, instead of
  on its top border. The field keeps the room above the control at all
  times, so rising moves nothing else; at rest the label lies inside the
  control as before. Without the class a raised label still sits on the
  border.
- eccea69: A floating label in `forms.css` now glides between resting and raised
  instead of jumping. It moves and shrinks by a transition of its
  `transform` (ease-out, 0.18s by default, set with
  `--gridkit-forms-label-transition-duration`), with its colour and
  background fading alongside, rather than by changing its `font-size`,
  offsets and padding; it scales from its inline start, so it mirrors under
  `dir="rtl"`. The label keeps its weight in both places, and a placeholder
  fades in as it rises. Under `prefers-reduced-motion: reduce` it still
  moves without a transition.
- e8a7c5d: `forms.css` styles the forms packages' masked input
  (`gridkit-forms-masked-input`, its control
  `gridkit-forms-masked-input-control`) in the box every text input shares.
  The mask is always written left to right, so the text sits at the field's
  start by the field's direction, in tabular figures; `is-monospace` sets
  the control in `--gridkit-forms-mask-font-family` (the system's monospace
  fonts by default), so the slots line up down a column of fields.
- 5b83386: `forms.css` styles the forms packages' number inputs. A number input
  (`gridkit-forms-number-input`, with `gridkit-forms-percent-input` beside it
  for a percentage) draws the text input's box; its number sits at the box's
  end in tabular figures (the start with `is-align-start`), on the side the
  field's direction gives even when the control itself is left to right. The
  currency sign, percent sign or unit beside it
  (`gridkit-forms-number-input-affix`) is in the muted text colour, or
  `--gridkit-forms-affix-color` when set. Stepper buttons
  (`gridkit-forms-stepper-button`) sit inside the box against its edge:
  stacked in a column `--gridkit-forms-stepper-width` wide (20px by default)
  at the end with `is-stepper-end`, or one at each end with
  `is-stepper-split`, divided from the text by a line, on the muted surface
  when hovered and in the muted text colour when `is-disabled`. Under a
  coarse pointer the stacked buttons sit side by side, each at least 24px;
  under forced colours they draw in `CanvasText`, and `GrayText` when
  disabled.
- 351025c: `forms.css` styles the forms packages' number range input
  (`gridkit-forms-number-range-input`). Its two ends share one box
  (`gridkit-forms-range-control`, beside `gridkit-forms-control`), each a
  number control (`gridkit-forms-range-start`, `gridkit-forms-range-end`)
  sharing the room and shrinking to three characters before the box would
  wrap, with the separator (`gridkit-forms-range-separator`) between them,
  `--gridkit-forms-range-gap` on each side (the spacing unit by default).
  The span after the end (`gridkit-forms-range-span`) is muted, at the hint
  size. The numbers align as a number input's do, following the field's
  direction; under forced colours the separator and span draw in
  `CanvasText`.
- eccea69: `forms.css` styles the forms packages' form structure: a form, a
  fieldset and a section's body stack their parts; a section has a titled
  header over a line and, when collapsible, a chevron that turns while it is
  closed (without a transition under `prefers-reduced-motion`); a layout lays
  fields out in up to four columns that drop to fewer as it narrows (fixed
  breakpoints at 32rem, 48rem and 64rem, through container queries), with
  spans that never take more columns than there are, and stacks start labels
  on top below 30rem; a field group puts its inputs side by side; and a
  message summary is a panel edged in its most serious severity's colour,
  listing links to the fields. It now also declares `--gridkit-border-width`,
  `--gridkit-radius`, `--gridkit-control-radius`, `--gridkit-focus-ring-width`
  and `--gridkit-focus-ring` with the grid's defaults, so it still works
  alone.
- 815ede2: `forms.css` styles the forms packages' text inputs. A text control sits in
  a box (`gridkit-forms-control`) as tall as its density picks (24px compact,
  32px standard, 40px comfortable by default, read from
  `--gridkit-forms-control-height`, `-compact` and `-comfortable`), with a
  border in the muted text colour, at 3:1 or more against the surface in
  every preset. While the field shows a message the border and the focus
  ring take the colour of the most serious one: error, warning, info or
  success. Read-only and disabled boxes sit on the muted surface. The box
  holds a prefix and a suffix, a clear button, a password's reveal button and
  a spinner that turns while the input loads (a still ring under
  `prefers-reduced-motion`); a counter shows under it. A multiline input's
  textarea has a line height of 1.5 and rests a floating label on its first
  line, a search input shows a search icon and hides the browser's own clear
  button, and an upper-cased input shows its text upper-cased. Under forced
  colours an error or warning box keeps a thicker border; under a coarse
  pointer the icon buttons are at least 24px. It now also declares
  `--gridkit-icon-size` with the grid's default, so it still works alone.
- b43284a: `forms.css` styles the forms packages' checkboxes and switches. Each sits
  on a row as tall as a text box of its density, the native control laid
  transparent over the whole row so the label is part of what a press hits.
  A checkbox's box is drawn as the grid draws its own checks: an outline in
  the muted text colour, filled with the accent and ticked (or marked with a
  dash when mixed) in `--gridkit-accent-fg` when checked. A switch's track is
  1.75 times as wide as it is tall, muted when off and the accent when on,
  and its thumb moves to the inline end when on, so it follows `dir`. The box
  border and the track border, and their focus rings, take the colour of the
  most serious message shown. Under forced colours both draw in system
  colours, under `prefers-reduced-motion` they stop animating, and under a
  coarse pointer each row is at least 24px in both directions. It now also
  declares `--gridkit-accent-fg` with the grid's default, so it still works
  alone.
- eccea69: Three new palette colours for messages of each severity, beside
  `--gridkit-error`: `--gridkit-warning` (the accent turned amber),
  `--gridkit-success` (the accent turned green) and `--gridkit-info` (the
  accent), each a `-light`/`-dark` pair like the other colours, with
  `bg-gridkit-warning` and the rest as Tailwind utilities. They follow a
  preset's accent, and fall back to the text colour where relative colour
  syntax is unsupported, as `--gridkit-error` does. The default preset lists
  them; the grid's own styles do not change.
- 0ebd2f9: New entry `@gridkitjs/theme-tailwind/forms.css`, the stylesheet for the
  upcoming GridKit forms packages. It declares the palette with the grid's
  defaults, follows dark mode and `.gridkit-light`/`.gridkit-dark` as
  `styles.css` does, and registers the same colour utilities
  (`bg-gridkit-accent`), so it works alone or beside `styles.css`, in either
  order. Its tokens sit on `:where(:root)`, so a preset or your own `:root`
  overrides win wherever they are loaded. `styles.css` is unchanged.

### Patch Changes

- 28ac4c9: `forms.css` no longer shrinks text again at each level when
  `--gridkit-font-size` is relative, as the Spreadsheet preset's `0.875em`
  is. Only the outermost forms element (a form, a field, a text or search
  input, a message summary) takes the token; the ones inside it keep the size
  they inherit, so a field's label and its control's text match, and section
  and summary titles scale from the form's text.
- 28ac4c9: The Spreadsheet preset sets `--gridkit-info` to its accent turned blue.
  Its accent is green, so information messages were the same colour as
  success ones.

## 0.15.0

### Minor Changes

- c5d32e7: The stylesheet draws an empty grid's message (`.gridkit-grid-empty-row`): muted, centred text at least `calc(var(--gridkit-spacing) * 24)` tall. `.gridkit-grid-empty-content` sticks to the start edge and is as wide as the scroll area's inside, from the `--gridkit-empty-width` the grid sets on it, so the message stays in view and centred while a wide grid scrolls sideways.
- b292ac6: The stylesheet draws a loading grid's overlay (`.gridkit-grid-loading-overlay`): a translucent layer in the surface colour over the body, above pinned cells and under the sticky header and footer, with its message (`.gridkit-grid-loading-overlay-content`) centred in the rows in view. The message sticks under the header at the start edge, as wide as the scroll area's inside from the `--gridkit-loading-width` the grid sets on it, so it stays in view however the body scrolls. Over a body with no rows (`.is-empty`) the overlay is as tall as the empty message. `.gridkit-data-grid-body` is now `position: relative`, the box the overlay covers.

## 0.14.0

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

## 0.13.0

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

## 0.12.0

### Minor Changes

- 353ba81: New theme tokens for the grid's colours and type. Each defaults to the look
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

- 353ba81: New theme tokens for the grid's spacing, lines, corners and details. Each
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

- d2ada2a: Breaking: the palette's Tailwind colours carry a `gridkit-` prefix, so they
  no longer claim names like `accent` or `surface` in your app's own theme.
  Rename each use in your classes: `bg-accent` becomes `bg-gridkit-accent`,
  `text-fg-muted` becomes `text-gridkit-fg-muted`. The unprefixed names are no
  longer registered.

  The nine colours are `gridkit-surface`, `gridkit-surface-muted`,
  `gridkit-line`, `gridkit-hover-line`, `gridkit-fg`, `gridkit-fg-muted`,
  `gridkit-accent`, `gridkit-selected` and `gridkit-selected-strong`.
  `gridkit-hover-line` is new. The `--gridkit-*` custom properties are
  unchanged.

- 432b82f: Theme presets: ready-made themes you import after the stylesheet to restyle
  the grid, its menus included, in one line.

  ```css
  @import "tailwindcss";
  @import "@gridkitjs/theme-tailwind/styles.css";
  @import "@gridkitjs/theme-tailwind/presets/spreadsheet.css";
  ```

  Each preset sets theme tokens on `:root` and nothing else, in light and dark
  mode: `spreadsheet.css`, `comfortable.css`, `high-contrast.css` and
  `midnight.css`. `default.css` sets every token to its default, as a template
  to copy for a theme of your own: change what you want, and delete the lines
  you keep. `@gridkitjs/theme-tailwind/presets/index.json` lists the presets
  with an `id`, `label`, `description` and `file` each, for tools that offer a
  choice of them.

- 353ba81: `@gridkitjs/theme-tailwind/tokens.json` lists every theme token the
  stylesheet declares, for building theme tools or docs on top of it. Each
  entry gives the token's `name`, its `group` (`colors`, `typography`,
  `density`, `borders`, `shape` or `details`), a `tier` (`basic` for the
  palette and the base knobs, `advanced` for a token that tunes one part of
  the grid), its `type`, its `default` and a one-sentence `description`. A
  colour is listed by its live name, such as `--gridkit-accent`, with a
  `{ "light", "dark" }` default: override its `--gridkit-accent-light` and
  `--gridkit-accent-dark` pair on `:root`.

  ```js
  import manifest from "@gridkitjs/theme-tailwind/tokens.json" with { type: "json" };

  const accent = manifest.tokens.find(
    (token) => token.name === "--gridkit-accent",
  );
  ```

### Patch Changes

- 680515a: The grid no longer relies on Tailwind's Preflight. It sets
  `box-sizing: border-box` on itself, its menus and its drag ghosts, and its
  buttons and inputs take the surrounding font, so it draws the same in an app
  with Preflight turned off. With Preflight on, nothing changes.
- 353ba81: The triangle on a group row turns open or closed at once, without its
  transition, when the user's system asks for reduced motion
  (`prefers-reduced-motion: reduce`), whatever a theme sets
  `--gridkit-transition-duration` to.

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
