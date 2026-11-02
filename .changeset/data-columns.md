---
"@gridkitjs/core": minor
---

Add `DataColumn` — `{ id, column }`, a column without its width — and
`resolveDataColumns(columns, order)`, which orders column definitions and pairs
each with its id. `filterRows`, `sortRows`, `resolveShownRows`, `groupRows`,
`computeAggregates` and `withGroupAggregates` now accept `DataColumn[]` in place
of `ResolvedColumn[]`; a `ResolvedColumn[]` still fits, so no call site changes.
