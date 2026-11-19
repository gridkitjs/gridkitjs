---
"@gridkitjs/react": minor
---

A `paginated` `DataGrid` under `dataMode: "server"` without `rowCount` logs a `console.error`: without the total, the pager counts only the rows given, one page. Pass `rowCount={0}` until the first response arrives.
