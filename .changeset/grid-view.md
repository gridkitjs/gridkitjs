---
"@gridkitjs/core": minor
---

Add `resolveGridView(input)`, which derives everything a grid shows in one
call: rows filtered, sorted, grouped, aggregated and paginated, and columns
ordered and sized, returned as a `GridView` (`dataColumns`, `columns`, `rows`,
`displayRows`, `pageRows`, `displayDataRows`, `pageCount`, `pageIndex`,
`grandTotal`). `createGridViewResolver()` returns a memoised version that
recomputes only the stages a change touches — a column resize or a viewport
change leaves every row list and the grand total untouched. New types:
`GridState`, `GridViewInput`, `GridViewOptions`, `GridView`, and `ResizeMode`
(moved from `@gridkitjs/react`, which still exports it).
