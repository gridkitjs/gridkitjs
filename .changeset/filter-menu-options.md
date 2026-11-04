---
"@gridkitjs/core": minor
---

Filter menu options, for a renderer to draw a filter menu in each column's
header. `GridOptions` gains `filterableColumns` (off by default, like
`sortableColumns`) and `filterMenu` — `{ ui?: "simple" | "excel";
showCounts?: boolean; valueLimit?: number }`. `ColumnDefinition` gains
`filterable` and `filterMenu` — `{ ui?, operators? }` — which override the
grid's, as `sortable` does.

`resolveColumnFilterMenu(options, column)` settles them for one column: `null`
when it has no filter menu, else a `ResolvedColumnFilterMenu` — its `ui`
(`"simple"` by default), the `operators` its conditions offer (the column's
own without `in`, else its type's `defaultFilterOperators`), its operator
`family`, `showCounts` (off by default) and `valueLimit`
(`DEFAULT_FILTER_VALUE_LIMIT`, 10,000, by default).
