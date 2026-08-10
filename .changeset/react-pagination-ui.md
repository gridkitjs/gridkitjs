---
"@gridkitjs/react": minor
---

Pagination: split the grid's rows into pages, respecting group boundaries.

```ts
<DataGridComponent
  columns={columns}
  dataSource={rows}
  paginated
  defaultPagination={{ pageIndex: 0, pageSize: 25 }}
  pageSizeOptions={[10, 25, 50]}
  onPaginationChange={({ pagination }) => persist(pagination)}
/>;
```

- `paginated` turns pagination on; `defaultPagination`/`onPaginationChange` are the uncontrolled page/page-size pair and its change callback, mirroring `defaultColumnSort`/`onColumnSortChange`. Pagination always composes after filtering, sorting, and grouping — a page is a window onto the finished result. When grouping is also active, a page's unit is a top-level group, never a leaf row, so a group is never split across a page boundary.
- Turning `paginated` on renders a minimal, semantically-classed pager below the grid (Previous/Next, a page display, and — with `pageSizeOptions` — a page-size select). Style it via `@gridkitjs/theme-tailwind` or your own CSS.
- `DataGridApi` gains `getPagination()`, `getPageCount()`, `goToPage()`, `nextPage()`, `previousPage()`, and `setPageSize()`.
- Filtering, sorting, or changing the group-by stack resets to the first page, so a user is never silently stranded on a page a smaller result set no longer has.

Depends on `@gridkitjs/core`'s new pagination primitives (`paginateRows` and friends) — see that package's own changelog entry, including the `datasetIndex` field this adds to `ResolvedRow`/`ResolvedGroupRow`/`CellTemplateContext`.

Breaking: `aria-rowindex` on a rendered row is now built from that row's absolute dataset position rather than its rendered position — the two only diverge once `paginated` is on, but the change applies unconditionally. `GridGroupRow`'s exported prop shape (if consumed directly, which is not the supported path) drops `rowIndex` in favor of `datasetIndex`.
