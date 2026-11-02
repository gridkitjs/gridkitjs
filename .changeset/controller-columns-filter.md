---
"@gridkitjs/core": minor
---

The grid controller now also owns the filter, column widths, column order and
column visibility. New actions: `setFilter`, `resizeColumn(columnId, width,
phase)`, `cancelColumnResize`, `setColumnSizing`, `moveColumn(columnId,
beforeId)`, `setColumnOrder`, `showColumns`, `hideColumns` and
`setColumnVisibility`, each reporting through the slice's existing callback.

`GridOptions` gains controlled `filter`, `columnSizing`, `columnOrder` and
`columnVisibility` options, and `onFilterChange` with the new
`FilterChangeEvent` type (`{ filter }`). A filter change sends an uncontrolled
pagination back to the first page, as a sort or grouping change does.
