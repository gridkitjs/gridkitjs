---
"@gridkitjs/react": minor
---

`DataGrid` takes `onRowClick` and `onRowDoubleClick`, called with the row,
the column clicked and the modifiers held, and `getRowProps`, which adds a
class and `data-*` attributes to each data row. Every data row now carries
`data-gridkit-row-id`, its id as `getRowId` resolves it.
`selectable.toggleOnClick` makes a plain click toggle a row rather than
select it alone. `RowPointerEvent` and `RowProps` are re-exported.
