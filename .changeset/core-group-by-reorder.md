---
"@gridkitjs/core": minor
---

`moveGroupByBefore`/`movesGroupBy` — the group-by counterpart of
`moveColumnBefore`/`movesColumn`, positioning a column within `GroupByState`
in front of another, or inserting it fresh if it isn't grouped yet. Backs the
new drag-a-header-into-the-group-by-bar and drag-a-chip-to-reorder
interactions in `@gridkitjs/react`.

`ColumnDefinition` gains `groupByDraggable` (whether a column's header may be
dragged into the group-by bar) and `groupToggleIcon` (whether a groupable
header shows its group-toggle icon), mirroring `sortable`/`reorderable`.
`ColumnResolveOptions`/`ResolvedColumn` gain the matching `groupByDraggable`
field.
