---
"@gridkitjs/react": minor
---

A column with a filter menu — every column under `filterableColumns`, or one
whose own `filterable` is `true` — opens it from "Filter…" in its header's
context menu: a dialog below the header, named after its column ("Name
filter"), with the column's sort entries while it sorts, then "Clear filter",
Cancel and OK. Tab stays inside it; Escape or a click outside closes it,
giving focus back to the header. Its sort entries and "Clear filter" run the
`sort.*` and `filter.clear` commands, so `onCommand` hears them with the
source `"filterMenu"`.
