---
"@gridkitjs/react": patch
---

`DataGrid` reads group expansion as the mode with exceptions `@gridkitjs/core`
now stores. A change to every group at once (`expandAllGroups`,
`collapseAllGroups`, `setGroupExpansion`) is announced by the mode the groups
follow afterwards, and `useGroupByState` reads `groupExpansion` as
`ALL_EXPANDED` before the grid mounts.
