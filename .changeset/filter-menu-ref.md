---
"@gridkitjs/react": minor
---

`DataGridApi` gains `openFilterMenu(columnId)`, which opens a shown column's
filter menu below its header and returns whether it did — `false` for a
column with no filter menu — and `closeFilterMenu()`, which closes it and
leaves the column chooser open.
