---
"@gridkitjs/core": minor
---

A built-in `print` command prints the grid's view — every row an export would
hold, across pages and collapsed groups — under a new `print` grid option, a
`PrintOptions`. It shows on the grid, the toolbar, the body and a cell, is
labelled by the new `print` message ("Print") with the new `print` icon key,
and hands the host the document `exportPrintDocument(source, options)` builds:
`buildPrintDocument` over the grid's own view, its timestamp in the grid's
locale and, given no `title`, titled with the grid's `label`. `print` is no
longer a reserved command id.
