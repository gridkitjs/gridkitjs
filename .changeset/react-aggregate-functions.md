---
"@gridkitjs/react": minor
---

Aggregates: compute a subtotal per group and a grand total over the whole filtered/grouped dataset.

```ts
<DataGridComponent
  columns={columns}
  dataSource={rows}
  groupableColumns
  defaultGroupBy={[{ columnId: "Region" }]}
  aggregates={[{ columnId: "Amount", fn: "sum" }]}
/>;
```

- `aggregates` is a plain controlled prop — `AggregateState<Row>`, an array of `{ columnId, fn, id? }` specs. Unlike `sort`/`filter`/`groupBy`/`pagination`, there is no built-in UI to add or remove an aggregate interactively, so there's no `defaultAggregates`/`onAggregatesChange` pair.
- A group header renders its own subtotal inline, next to its leaf-row count. A grand-total footer (a `<tfoot>`, outside `aria-rowcount`) renders below the body whenever `aggregates` is non-empty.
- `ColumnDefinition.footerTemplate` renders a column's own aggregate result in place of its plain formatted value, in both the group header and the grand-total footer.
- Aggregates are always computed over the full dataset, never scoped to the current page — composed ahead of pagination in the render pipeline, so a group's subtotal reads identically regardless of which page currently shows it.
- `DataGridApi` gains `getAggregates()` for the grand total; a specific group's own results are read off `getDisplayRows()`, which now returns rows carrying a populated `aggregates` field.

Depends on `@gridkitjs/core`'s new aggregate primitives (`computeAggregates`/`withGroupAggregates`) — see that package's own changelog entry, including the additive `aggregates` field it adds to `ResolvedGroupRow`.
