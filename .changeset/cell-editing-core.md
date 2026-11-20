---
"@gridkitjs/core": minor
---

Columns can be made editable. `ColumnDefinition` gains `editable` (`true`,
or a function of the row), `valueParser` (typed text to a value),
`validate` (a message refuses the value) and `editTemplate` (a custom
editor, given an `EditTemplateContext`). `isCellEditable(view, cell)` says
whether a cell may be edited: a data row on the current page, a shown
column, and `editable` true for its row. `parseCellText` and
`formatCellEditText` read an editor's text by column `type` and write it
back, and the renderer entry gains `isColumnEditable`. A grid with no
editable column is unchanged.
