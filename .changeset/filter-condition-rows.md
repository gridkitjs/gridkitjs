---
"@gridkitjs/core": minor
---

A condition model for a simple filter editor's rows, which hold text until
the editor is applied. `filterOperandArity(operator)` says how many inputs a
row shows. `parseFilterOperand(text, type)` reads a typed operand as the
column filters it — a number with a point for decimals, rejecting `"12abc"`
and `"1,5"`; a date as a date input (`yyyy-mm-dd`, local midnight) or a
date-time input (`yyyy-mm-ddThh:mm`) gives it — and `formatFilterOperand(value,
type)` writes one back for its input.

`conditionRowsFrom(shape, operators, type)` opens a column's two rows over its
`describeColumnFilter` shape, as `ConditionRowDraft`s — `{ operator, text,
textTo }`. `conditionsFromRows(rows, columnId, type)` reads them back as
`{ conditions, invalid }`: the conditions for `filterEditorReducer`'s
`setConditions`, and the indexes of rows whose operand is missing or doesn't
read. An empty second row is dropped rather than invalid.
