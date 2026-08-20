---
"@gridkitjs/react": minor
---

New `useColumnSizingState(gridRef)` and `useColumnOrderState(gridRef)` hooks: column widths and column order, read reactively off a mounted `DataGridComponent`'s `ref`. Read-only — sizing and order stay uncontrolled via `defaultColumnSizing`/`defaultColumnOrder` and the grid's own resize/reorder handles.
