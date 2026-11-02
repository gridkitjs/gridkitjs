---
"@gridkitjs/react": patch
---

`DataGrid` keeps row, column and cell selection in its grid controller too,
which fires the selection callbacks from one diff per change exactly as
before. Nothing changes for a grid using the existing props.
