---
"@gridkitjs/dom": minor
---

`RowVirtualizer` has a `measureRows(rows)` method, which reads the heights of
rows already on screen (`[index, element]` pairs) and works out the window
once. Call it after `setRowCount` on a virtualizer created over rows drawn
before it existed, so its first window matches them rather than one placed by
`estimatedRowHeight`.
