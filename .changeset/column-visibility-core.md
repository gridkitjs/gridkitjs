---
"@gridkitjs/core": minor
---

Columns can be hidden. `ColumnDefinition.hidden` sets where a column starts,
and a `columnVisibility` slice on `GridState` (`ColumnVisibilityState`, column
id → `true` shown / `false` hidden) records what the user changed.
`resolveGridView` drops hidden columns from `columns` after ordering and
before sizing; they stay in `dataColumns`, so a sort, filter or grouping on a
hidden column still applies and the column keeps its slot in the order.

New helpers: `isColumnVisible(column, visibility)`,
`applyColumnVisibility(dataColumns, visibility)` and
`setColumnVisibility(dataColumns, visibility, columnIds, visible)`, plus the
`ColumnVisibilityEvent` type (`{ columnIds, visibility }`).
