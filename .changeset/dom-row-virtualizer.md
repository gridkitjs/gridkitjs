---
"@gridkitjs/dom": minor
---

`createRowVirtualizer(scrollElement, { estimatedRowHeight, overscan, onRange })`
windows rows of any height down to those near the scroll position, measuring
each mounted row, and reports the window through `onRange` only when it moves.
It has `setRowCount`, `resetHeights`, `measureRow(index)` ref callbacks,
`scrollToIndex` (which corrects itself once an unmounted target mounts) and
`destroy`.
