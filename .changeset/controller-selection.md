---
"@gridkitjs/core": minor
---

The grid controller now owns row, column and cell selection. `GridState`
gains `rowSelection`, `columnSelection` and `cellSelection`; `GridOptions`
gains controlled props for each beside their `default*` ones; and the
selection callbacks move into core as `SelectionCallbacks<Row, Node>`, fired
from one diff per change exactly as `@gridkitjs/react` fired them. New actions:
`selectRow`, `selectRows(ids, intent?)`, `selectAllRows`, `clearSelection`,
`setRowSelection`, `selectColumn`, `setColumnSelection`, `selectCell` and
`setCellSelection`. `GridControllerOptions.onSelectionDiff` reports each row
or column change by id, for a renderer's own feedback.

`resolveGridView`'s `state` is now typed `GridViewState<Row>` — `GridState`
without the selections, which the view never reads; a whole `GridState` still
fits.
