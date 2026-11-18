---
"@gridkitjs/theme-tailwind": patch
"@gridkitjs/theme-css": patch
---

In a grid wider than its container, the rows now scroll sideways together
with the header and footer. Before, `.gridkit-data-grid-body` was a
sideways scroller of its own: a horizontal wheel or trackpad over the rows,
a swipe on them, or keyboard focus moving to a column out of view scrolled
the rows alone, leaving the column titles over the wrong columns, and
scrolling the grid sideways by its own scrollbar cut the rows off at the
container's width. The row area is now as wide as its table and scrolls only
up and down, so `.gridkit-data-grid-viewport` scrolls the header, rows and
footer as one, in left-to-right and right-to-left pages, with or without
`height`. Under `height`, the row area's vertical scrollbar sits past the
last column in a grid wider than its container. Vertical scrolling and row
virtualization are unchanged.
