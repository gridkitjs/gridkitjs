---
"@gridkitjs/react": minor
---

New `useAggregateState(gridRef)` hook: the grand-total aggregate results, read reactively off a mounted `DataGridComponent`'s `ref`, for a summary footer or bar living outside the grid's own DOM. Read-only, and updates even on changes with no dedicated `on*Change` prop of their own — a filter/sort/regroup altering the grand total.
