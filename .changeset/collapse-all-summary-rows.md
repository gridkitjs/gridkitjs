---
"@gridkitjs/core": patch
---

`collapseAllGroups` no longer lists a group twice when given display rows that
carry summary rows (`groupAggregateDisplay: "row"`), such as
`DataGridApi.getDisplayRows()`.
