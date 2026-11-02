---
"@gridkitjs/react": minor
---

`DataGridApi` can now drive every slice of state, not only read it:
`setColumnSort`, `setGroupBy`, `setGroupExpansion`, `setPagination`,
`setColumnSizing`, `setColumnOrder`, `setColumnVisibility`,
`setRowSelection`, `setColumnSelection` and `setCellSelection` each replace
their slice and fire its `on*Change` callback as a user's change would
(nothing for an equal value; only a request for a controlled slice).
`getState()` reads every slice at once and `restoreState(saved)` puts a whole
or partial state back with one re-render; `serializeGridState`, now
re-exported from `@gridkitjs/react`, makes it safe to save as JSON.
`autoFitColumn(columnId)` sizes a column to its content as double-clicking
its resize handle does.

`setFilter` now treats a filter equal in content to the current one as no
change, rather than only the same entries.
