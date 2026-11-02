---
"@gridkitjs/react": minor
---

`DataGrid` takes controlled `columnSizing`, `columnOrder` and
`columnVisibility` props beside `defaultColumnSizing`, `defaultColumnOrder`
and `defaultColumnVisibility`. Given one, the grid applies it as given, and a
resize, a drop or `showColumns`/`hideColumns` asks for a change through
`onColumnResize` (whose `sizing` is the next state), `onColumnOrderChange` or
`onColumnVisibilityChange` instead of making it.
