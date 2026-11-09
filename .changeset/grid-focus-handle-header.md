---
"@gridkitjs/react": patch
---

`DataGridApi.focusCell(rowIndex, columnIndex)` and `getFocusedCell()` keep their signatures on top of the header-or-body `GridFocus` from `@gridkitjs/core`, and their docs now say what was only implied: a negative `rowIndex` passed to `focusCell` moves the tab stop to the header's cell at `columnIndex`, and `getFocusedCell()` reports the header as row `-1`.
