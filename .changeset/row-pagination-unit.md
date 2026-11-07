---
"@gridkitjs/core": minor
---

A new `paginationUnit` grid option sets what `pageSize` counts once the rows
are grouped. `"group"`, the default, keeps today's pages of whole top-level
groups. `"row"` counts data rows and collapsed group headers instead, so a
page of 25 holds 25 rows however large the groups are, and a page that
continues a group starts with that group's headers again. `paginateRows`
takes it as a third argument, `{ unit: "row" }`, and `resolveGridView` as
`options.paginationUnit`. Changing it sends an uncontrolled pagination back to
the first page, as a sort, filter or grouping change does.
