---
"@gridkitjs/react": minor
---

The filter can now change after mount. `DataGridApi` gains `getFilter()` and
`setFilter(filter)`, which replaces the filter, sends the grid back to its
first page and fires the new `onFilterChange` prop once (`{ filter }`). A
`useFilterState(gridRef)` hook returns `{ filter, setFilter }` for a filter UI
outside the grid, and a controlled `filter` prop holds the filter in your own
state alongside `defaultFilter`.
