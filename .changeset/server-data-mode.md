---
"@gridkitjs/core": minor
---

`GridOptions` and `GridViewOptions` add `dataMode` (`"client" | "server"`, exported as `DataMode`) and `rowCount`, for data a server sorts, filters and pages. Under `dataMode: "server"` the view shows the rows it is given in the order given, without filtering or sorting them, and the sort, filter and pagination state are kept and reported through the same callbacks as before, so the app learns what to fetch. With `paginated` on, the rows given are the page `pagination` names: pages are counted from `rowCount`, the page index is clamped into them, each row's `datasetIndex` is offset by the pages before it, and `paginationUnit` is ignored. Grouping, aggregates and the grand total cover the rows given.

`GridView` adds `rowCount`, the number of rows the grid has across every page, as `aria-rowcount` counts them: in client mode every display row, in server mode the `rowCount` option (or the rows given, without one).

A grid that sets neither option behaves as before.
