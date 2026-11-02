---
"@gridkitjs/react": minor
---

`DataGrid` takes controlled `columnSort`, `groupBy`, `groupExpansion` and
`pagination` props beside the existing `default*` ones. Given one, the grid
shows exactly that value, and a header click, group toggle or pager button
only asks for a change through the matching `on*Change` callback, taking
effect once the prop follows:

```tsx
const [sort, setSort] = useState<ColumnSortState>([]);

<DataGrid
  sortableColumns
  columnSort={sort}
  onColumnSortChange={(event) => setSort(event.sort)}
/>;
```

Each slice is controlled or not on its own; passing both a controlled prop and
its default logs a `console.error` once and the controlled value wins. A
controlled `pagination` is not sent back to the first page when the filter,
sort or grouping changes — reset it alongside the change if you want that.
