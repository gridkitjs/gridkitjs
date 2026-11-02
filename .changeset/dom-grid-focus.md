---
"@gridkitjs/dom": minor
---

`createGridFocus({ rowCount, columnCount, isSkippableRow, virtualRange })`
keeps a grid's single tab stop: `getFocus`, `subscribe`, `focusCell`,
`handleKey(key, modifiers, pageSize)` for the navigation keys, `attach` to the
rendered rows, and `focusDrawnCell` to move the browser's focus once a move is
drawn — scrolling a virtualized row into range first. `findBodyRow` and
`measurePageSize` read the grid's markup.
