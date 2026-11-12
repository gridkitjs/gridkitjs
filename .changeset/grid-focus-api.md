---
"@gridkitjs/react": minor
---

Breaking: `DataGridApi.focusCell` takes the cell as one `GridFocus`, and `getFocusedCell()` returns one, in place of a row and a column index where row `-1` meant the header. `GridFocus` is the header-or-body type from `@gridkitjs/core`, now re-exported by `@gridkitjs/react` too:

```ts
// Before
api.focusCell(2, 1);
api.focusCell(-1, 0); // the header's first cell

// After
api.focusCell({ area: "body", rowIndex: 2, columnIndex: 1 });
api.focusCell({ area: "header", columnIndex: 0 });
```

`getFocusedCell()` tells the header apart by `area` rather than by a row of `-1`, and a header focus has no `rowIndex`:

```ts
// Before
const { rowIndex, columnIndex } = api.getFocusedCell();
if (rowIndex === -1) {
  // the header
}

// After
const focus = api.getFocusedCell();
if (focus.area === "header") {
  // the header: { area: "header", columnIndex }
} else {
  // a body cell: { area: "body", rowIndex, columnIndex }
}
```

Either index is still held inside the grid, and `getFocusedCell()` still returns the same object until the focus moves.
