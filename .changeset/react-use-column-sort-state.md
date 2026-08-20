---
"@gridkitjs/react": minor
---

New `useColumnSortState(gridRef)` hook: the grid's active sort, read reactively off a mounted `DataGridComponent`'s `ref`, for a sort indicator living outside the grid's own DOM. Read-only — `DataGridApi` has no sort-mutating action.
