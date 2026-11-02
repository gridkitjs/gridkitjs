---
"@gridkitjs/react": patch
---

`DataGrid` now keeps its sort, filter, grouping, expansion, paging, column
widths, order and visibility in `@gridkitjs/core`'s grid controller rather
than in React state, and draws the controller's view. Nothing changes for a
grid using the existing props. `DataGridApi` getters now read the grid's
current state at call time, so a read straight after an action such as
`goToPage` already sees its result instead of the previous render's.
