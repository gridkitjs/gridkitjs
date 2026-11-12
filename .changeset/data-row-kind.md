---
"@gridkitjs/core": minor
---

Breaking: `ResolvedRow` carries `kind: "data"`, so every member of `DisplayRow` is told apart by its `kind`. A check for a data row that tested whether the entry has a `kind` at all is now always true and has to read the `kind` instead:

```ts
// Before
if ("kind" in row) {
  // a group header or a summary row
}

// After
if (row.kind !== "data") {
  // a group header or a summary row
}
```

A `switch (row.kind)` can now cover `"data"`, `"group"` and `"group-summary"` together. A `ResolvedRow` built by hand, such as test data passed to `groupRows` or `paginateRows`, needs `kind: "data"`:

```ts
// Before
const entry: ResolvedRow<Order> = {
  rowId: "1",
  row,
  rowIndex: 0,
  datasetIndex: 0,
};

// After
const entry: ResolvedRow<Order> = {
  kind: "data",
  rowId: "1",
  row,
  rowIndex: 0,
  datasetIndex: 0,
};
```

The rows `DataGrid`'s `getRows()`, `getDisplayRows()`, `getPageRows()` and `getSelectedRows()` return, and the rows the selection and row events carry, all have the field.
