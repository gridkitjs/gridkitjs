---
"@gridkitjs/core": minor
"@gridkitjs/react": minor
---

Breaking: the column-width callback is `onColumnSizingChange`, so every state slice reports through `on<Slice>Change`. It is the same callback under a new name: it still receives a `ColumnResizeEvent`, continuously with `phase: "move"` during a drag and once with `"end"`. Rename the prop on `DataGrid` and the option passed to `createGridController`:

```tsx
// Before
<DataGrid
  columnSizing={sizing}
  onColumnResize={(event) => setSizing(event.sizing)}
/>

// After
<DataGrid
  columnSizing={sizing}
  onColumnSizingChange={(event) => setSizing(event.sizing)}
/>
```
