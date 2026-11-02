---
"@gridkitjs/react": minor
---

Columns can be shown and hidden. A column with `hidden: true` starts out
hidden; `defaultColumnVisibility` (column id → `true`/`false`) overrides that
per column, and the ref's `showColumns(ids)` / `hideColumns(ids)` change it
afterwards. A hidden column still sorts, filters and groups, and keeps its
place in the column order for when it is shown again.

- `onColumnVisibilityChange` fires once per change with `{ columnIds,
visibility }`.
- `DataGridApi` gains `getColumnVisibility()` and `getDataColumns()` (every
  column, hidden ones included); `getColumns()` lists only what is shown.
- `useColumnVisibilityState(gridRef)` follows the visibility state from
  outside the grid.
- `aria-colcount`, the column widths and keyboard column moves count only the
  columns shown; a group header or group-by chip for a hidden column keeps
  its label.
