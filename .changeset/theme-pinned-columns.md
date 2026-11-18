---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

The stylesheet draws pinned columns. A cell marked `is-pinned-start` or
`is-pinned-end` sticks to that edge of `.gridkit-data-grid-tables` at the
`--gridkit-pin-offset` it carries, in the header, the rows, the footer and
group summary rows, while the other columns scroll under it. Pinned cells are
opaque in every row state: they show their row's colour (stripe, hover,
selection, group summary, header, footer, or a class of your own) over the
surface colour, never the cells scrolled underneath; a row's background image
does not carry into them. The `is-pinned-edge` cell beside the scrolling
columns draws a divider in `--gridkit-line`, under any `borders` setting, and
the column before the end divider leaves out its own line so the two never
double. Printing the page puts pinned columns back in their own places.

A group row's label now sticks to the start edge in every grid, so it stays
in view however far a wide grouped grid scrolls sideways.
