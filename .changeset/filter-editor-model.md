---
"@gridkitjs/core": minor
---

The headless model a column's filter editor is drawn over, so a checklist
or condition editor needs no logic of its own:

- `describeColumnFilter(filter, columnId)` reads which form the column's
  filter is in — `none`, a `values` checklist, one or two `conditions`, or
  `custom`.
- `columnValueOptions(rows, dataColumns, filter, columnId, { search, limit, locale })`
  lists the column's distinct values with labels and counts, cascaded over
  the rows every other column's filter keeps.
- `initialFilterEditorDraft`, `filterEditorReducer`, `visibleFilterOptions`
  and `selectAllState` hold an editor's draft — checked values, search,
  blanks, a tri-state select-all, conditions — and `draftToFilter` applies
  it: everything checked removes the column's filter, a partial pick is one
  `in` entry.

New types: `ColumnFilterShape`, `ColumnValueOption`, `ColumnValueOptions`,
`ColumnValueQuery`, `FilterEditorAction`, `FilterEditorDraft`,
`SelectAllState`.
