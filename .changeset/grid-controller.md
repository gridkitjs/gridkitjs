---
"@gridkitjs/core": minor
---

Add `createGridController(options)`, a grid without a renderer: it holds the
grid's state, derives the view with `resolveGridView`, and carries the sort,
grouping, expansion and paging actions (`toggleColumnSort`, `setColumnSort`,
`toggleGroupBy`, `moveGroupBy`, `setGroupBy`, `toggleGroupExpansion`,
`expandAllGroups`, `collapseAllGroups`, `setGroupExpansion`, `goToPage`,
`nextPage`, `previousPage`, `setPageSize`, `setPagination`). Each action fires
the same callback, with the same payload, a user's interaction does.
`getState()` and `getView()` keep their identity until something changes, and
`subscribe(listener)` is called after each change, so either can back a
`useSyncExternalStore`-style subscription. Columns are inferred from
`dataSource` when none are given.

`GridOptions` gains controlled `columnSort`, `groupBy`, `groupExpansion` and
`pagination` options beside their `default*` counterparts: given, the grid
shows that value and an action only asks for a change through the matching
`on*Change` callback.

`defineColumnsFromRows` takes an optional `Node` type parameter, so its result
can be typed for any renderer's columns.
