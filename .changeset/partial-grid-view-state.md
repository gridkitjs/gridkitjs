---
"@gridkitjs/core": minor
---

`resolveGridView` and `createGridViewResolver` take any part of a `GridViewState` as `state`. A slice left out, or `undefined`, reads as the grid's starting default: no sizes, order, hidden columns, sort, filter or grouping, every group expanded, and the first page of 25. A call that passes every slice works as before:

```ts
// Before
resolveGridView({
  rows,
  columns,
  state: {
    columnSizing: {},
    columnOrder: [],
    columnVisibility: {},
    columnSort: query.sort,
    filter: query.filter,
    groupBy: [],
    groupExpansion: ALL_EXPANDED,
    pagination: query.page,
  },
  options: { paginated: true },
});

// After
resolveGridView({
  rows,
  columns,
  state: {
    columnSort: query.sort,
    filter: query.filter,
    pagination: query.page,
  },
  options: { paginated: true },
});
```

Breaking for code that reads the input rather than building it: `GridViewInput["state"]` is the partial shape, so a function that takes a `GridViewInput` and reads `input.state.columnOrder` must allow for a slice left out.
