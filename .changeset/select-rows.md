---
"@gridkitjs/react": minor
---

`DataGridApi` gains `selectRows(rowIds, intent?)`, which selects rows by id
within `selectable.rows` (`"replace"` by default, or `"toggle"`) and fires the
row selection callbacks once, and `getSelectedRows()`, which returns the
selected rows themselves in selection order. Selection can also be held in
your own state with the controlled `rowSelection`, `columnSelection` and
`cellSelection` props beside their `default*` ones; a click then asks for a
change through the selection callbacks instead of making it.
