---
"@gridkitjs/core": minor
"@gridkitjs/react": minor
---

Breaking: `CellSelectionState` is told apart by its `kind`, `{ kind: "none" }` or `{ kind: "cell", rowId, columnId }`, in place of `{ rowId, columnId }` or `null`. Every place that takes or gives one changes with it: `defaultCellSelection`, `cellSelection`, `setCellSelection`, `getCellSelection()`, the `selection` of `CellSelectEvent` and `CellSelectionChangeEvent`, `useSelectionState`'s `cellSelection` (`{ kind: "none" }` before the grid mounts), and `isSameCell`, `selectCell` and `toggleCellSelection` from `@gridkitjs/core`:

```tsx
// Before
<DataGrid defaultCellSelection={{ rowId: "7", columnId: "amount" }} />;
api.setCellSelection(null);

// After
<DataGrid
  defaultCellSelection={{ kind: "cell", rowId: "7", columnId: "amount" }}
/>;
api.setCellSelection({ kind: "none" });
```

Reading the selection checks the `kind` first:

```ts
// Before
const cell = api.getCellSelection();
if (cell !== null) {
  show(cell.rowId, cell.columnId);
}

// After
const selection = api.getCellSelection();
if (selection.kind === "cell") {
  show(selection.rowId, selection.columnId);
}
```

A later release may add a kind, such as a range of cells, so a `switch` over it needs a `default` branch. Passing the state to `resolveCell`, which still takes a `{ rowId, columnId }` address or `null`, needs the same check.

`selectCell` and `toggleCellSelection` still take the cell to select as a `SelectedCellRef` (`{ rowId, columnId }`), and so does the controller's `selectCell`. Saved state keeps `version: 1`: a `cellSelection` saved without a `version`, as `null` or `{ rowId, columnId }`, restores as `{ kind: "none" }` or that cell.
