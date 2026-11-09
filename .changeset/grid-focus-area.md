---
"@gridkitjs/core": minor
---

Breaking: `GridFocus` names its area instead of putting the header at row
`-1`. It is `{ area: "header", columnIndex }` or
`{ area: "body", rowIndex, columnIndex }`, and `HEADER_ROW` is no longer
exported. `headerFocus(columnIndex)` and `bodyFocus(rowIndex, columnIndex)`
build one. `nextFocusForKey` returns the header for a `PageUp` past the first
row, where it returned a negative `rowIndex` for `clampFocus` to correct.

```ts
// Before
if (focus.rowIndex === HEADER_ROW) {
  focusHeaderCell(focus.columnIndex);
}
const top = { rowIndex: HEADER_ROW, columnIndex: 0 };

// After
if (focus.area === "header") {
  focusHeaderCell(focus.columnIndex);
}
const top = headerFocus(0);
```
