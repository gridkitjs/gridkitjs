---
"@gridkitjs/core": minor
"@gridkitjs/react": minor
---

A data row in a grouped grid now says where it sits. `groupRows` gives each
data row a `groupPosition` field, a new `RowGroupPosition` of `{ level,
position, setSize }`: its depth (`1` under a top-level group), its 1-based
place among its group's rows, and how many rows the group holds. The field is
absent from an ungrouped result, and `@gridkitjs/react` re-exports the type.
No change is needed to existing code.

`DataGrid` draws it as `aria-level`, `aria-posinset` and `aria-setsize` on
each data row of a `treegrid`, as the WAI-ARIA treegrid pattern asks, so a
screen reader can say how deep a row is and where it falls in its group. The
set size is the whole group's, so a group split across pages by
`paginationUnit: "row"` reads the same on every page. An ungrouped grid's
rows are unchanged.
