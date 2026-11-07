---
"@gridkitjs/react": minor
---

`DataGrid` takes a `paginationUnit` prop that sets what `pageSize` counts
once the rows are grouped. `"group"`, the default, keeps pages of whole
top-level groups. `"row"` counts data rows and collapsed group headers, so a
page of 25 draws 25 rows however large the groups are, and a page that
continues a group starts with that group's header again. The pager's page
count follows it. `PaginationUnit` is exported from `@gridkitjs/react`.
