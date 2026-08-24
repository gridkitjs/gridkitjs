---
"@gridkitjs/react": minor
---

New `usePaginationState(gridRef)` hook: reactive pagination state and actions (`goToPage`, `nextPage`, `previousPage`, `setPageSize`) read off a mounted `DataGridComponent`'s `ref`, for building a pager entirely outside the grid's own DOM. Updates on every pagination change, including the silent page-0 reset a filter/sort/regroup triggers.
