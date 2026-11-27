# @gridkitjs/theme-css

## 0.5.0

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
- 0ebd2f9: New entry `@gridkitjs/theme-css/forms.css`, the plain-CSS copy of the
  Tailwind theme's forms stylesheet for the upcoming GridKit forms packages.
  It declares the palette with the grid's defaults and follows
  `prefers-color-scheme` and `.gridkit-light`/`.gridkit-dark` as `styles.css`
  does, so it works alone or beside `styles.css`, in either order. Its tokens
  sit on `:where(:root)`, so a preset or your own `:root` overrides win
  wherever they are loaded. `styles.css` is unchanged.

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

## 0.4.0

### Minor Changes

- c5d32e7: The stylesheet draws an empty grid's message (`.gridkit-grid-empty-row`): muted, centred text at least `calc(var(--gridkit-spacing) * 24)` tall. `.gridkit-grid-empty-content` sticks to the start edge and is as wide as the scroll area's inside, from the `--gridkit-empty-width` the grid sets on it, so the message stays in view and centred while a wide grid scrolls sideways.
- b292ac6: The stylesheet draws a loading grid's overlay (`.gridkit-grid-loading-overlay`): a translucent layer in the surface colour over the body, above pinned cells and under the sticky header and footer, with its message (`.gridkit-grid-loading-overlay-content`) centred in the rows in view. The message sticks under the header at the start edge, as wide as the scroll area's inside from the `--gridkit-loading-width` the grid sets on it, so it stays in view however the body scrolls. Over a body with no rows (`.is-empty`) the overlay is as tall as the empty message. `.gridkit-data-grid-body` is now `position: relative`, the box the overlay covers.

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
