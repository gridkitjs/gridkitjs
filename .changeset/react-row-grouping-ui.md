---
"@gridkitjs/react": minor
---

Row grouping: stack one or more columns into nested, collapsible groups.

```ts
<DataGridComponent
  columns={columns}
  dataSource={rows}
  groupableColumns
  defaultGroupBy={[{ columnId: "Region" }, { columnId: "Status" }]}
  onGroupByChange={({ groupBy }) => persist(groupBy)}
/>;
```

- `groupableColumns` (grid-level) / `ColumnDefinition.groupable` (per-column)
  turn on each header's group toggle — click its icon, or focus the header
  and press `Alt+ArrowDown`, to add or remove that column from the group-by
  stack. A group-by bar above the grid lists the active stack as removable
  chips.
- `defaultGroupBy`/`onGroupByChange` and `defaultGroupExpansion`/
  `onGroupExpansionChange` for the uncontrolled group-by stack and its
  collapsed/expanded state. Click a group header, or focus it and press
  `Space`/`Enter`, to toggle it.
- `DataGridApi` gains `getGroupBy()`, `getGroupExpansion()`, `getDisplayRows()`
  (`getRows()`'s data regrouped, with group headers interleaved), and
  `expandAllGroups()`/`collapseAllGroups()`. `getRows()` itself is unchanged —
  it still returns the flat, ungrouped rows, exactly as before.
- The grid's `role` switches from `"grid"` to the WAI-ARIA `"treegrid"`
  pattern whenever `groupBy` is non-empty, with `aria-expanded`/`aria-level`/
  `aria-posinset`/`aria-setsize` on each group header row. An ungrouped grid
  is unaffected — `role="grid"` stays exactly as it was.

Depends on `@gridkitjs/core`'s new grouping primitives (`groupRows` and
friends) — see that package's own changelog entry.
