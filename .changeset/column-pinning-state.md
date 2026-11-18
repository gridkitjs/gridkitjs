---
"@gridkitjs/core": minor
---

Columns can be pinned to the grid's start or end edge. A column definition takes `pinned: "start" | "end"`, and the new `columnPinning` state slice (a `ColumnPinningState`, keyed by column id, where `"none"` unpins a column its definition pins) overrides it. The grid options take `defaultColumnPinning`, a controlled `columnPinning` and `onColumnPinningChange` (a `ColumnPinningEvent`), and the controller gains `pinColumn(columnId, pin)` and `setColumnPinning(pinning)`; `restoreState` puts the slice back, and saved state without it still restores. Pinning never changes `columnOrder`, so an unpinned column goes back to its place.

`view.columns` now lists the columns pinned to the start first and those pinned to the end last, each group in column order; `dataColumns` keeps column order. Each `ResolvedColumn` gains `pinned` (a `ColumnPin`: `"start"`, `"end"` or `"none"`), `pinOffset` (the summed widths of the columns pinned between it and its edge) and `pinEdge` (true on the last start-pinned and the first end-pinned column). `resolveColumnPin`, `applyColumnPinning` and `setColumnPin` work with the state directly, `ColumnResolveOptions` takes `pinning`, and `@gridkitjs/core/renderer` adds `pinnedWidths(columns)`, the width pinned to each edge.
