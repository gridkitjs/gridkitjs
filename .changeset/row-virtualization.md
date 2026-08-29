---
"@gridkitjs/core": minor
"@gridkitjs/react": minor
---

`virtualized`: renders only the rows near the current scroll position rather than every row at once, for a dataset too large to mount in full. Requires `height` to be set — a body with no bounded height has no viewport to window rows against, and a dev-time `console.error` fires if `virtualized` is on without it.

```tsx
<DataGridComponent
  columns={columns}
  dataSource={rows}
  height={400}
  virtualized
/>
```

Row height is measured per row rather than assumed uniform, so `.is-wrapped` cells and group header/summary rows (which differ in height from data rows) lay out correctly. Two new props tune it: `overscan` (rows rendered outside the visible range on each side, default `4`) and `estimatedRowHeight` (the assumed height for a row never yet measured, default `40`) — both meaningful only with `virtualized` on.

`scrollToRow` and keyboard navigation (arrow keys, `Home`/`End`, `Ctrl+Home`/`Ctrl+End`) both work correctly when their target row isn't currently mounted: they scroll it into range first, using measured heights where known, then correct the exact position once it mounts and is measured.

Fully orthogonal to `paginated` and `groupBy` — combinable with either, though virtualizing an already-small paginated page is low-value.

`@gridkitjs/core` gains `visibleRange` (plus its `RowHeights`/`VisibleRange` types) — the pure range math `virtualized` is built on. Not something most consumers need directly; it's exported for the same reason `paginateRows` is.
