---
"@gridkitjs/core": minor
---

Columns take two new props for exporting. `exportable: false` keeps a column
— one of action buttons, say — out of every export, clipboard copy and print.
`exportValue(value, row)` returns the typed value an export stores for a cell
(a new `ExportScalar`: `string | number | boolean | Date | null`) where the raw
value is not the one to keep; the text every format writes still comes from
`formatCellValue`.
