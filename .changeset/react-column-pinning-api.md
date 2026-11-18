---
"@gridkitjs/react": minor
---

`DataGrid` pins columns. Its props take `defaultColumnPinning`, a controlled `columnPinning` and `onColumnPinningChange`, over each column definition's `pinned: "start" | "end"`. The ref gains `getColumnPinning()`, `pinColumn(columnId, pin)` and `setColumnPinning(pinning)`, and the new `useColumnPinningState(gridRef)` hook reads the state reactively outside the grid. Pinning or unpinning one column announces it in the grid's live region, with the new `columnPinned` and `columnUnpinned` messages. `ColumnPin`, `ColumnPinningState` and `ColumnPinningEvent` are exported from `@gridkitjs/react`.

Every grid now draws its tables with separate borders, so a body row is half a pixel taller; see the theme's changelog.
