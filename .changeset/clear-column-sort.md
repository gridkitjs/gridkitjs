---
"@gridkitjs/core": minor
---

The controller has `clearColumnSort(columnId)`, which takes one column out of
the sort and keeps the rest. Its `onColumnSortChange` names that column, where
a `setColumnSort` leaving it out names the first key that changed — the next
column, when it was the first key. The built-in `sort.clear` command uses it,
so clearing the first key of a multi-column sort reports the column cleared.
