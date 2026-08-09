---
"@gridkitjs/react": minor
---

Drag a column header into the group-by bar to add it to the grouping, and
drag chips within the bar to reorder the stack.

```ts
<DataGridComponent
  columns={columns}
  dataSource={rows}
  groupableColumns
  groupByDraggableColumns
  groupByBarVisibility="always"
/>;
```

- `groupByDraggableColumns` (grid-level) / `ColumnDefinition.groupByDraggable`
  (per-column) let a header be dragged straight into the group-by bar,
  independent of `groupableColumns` — a column can be groupable via its
  header's click/keyboard toggle, via this drag, both, or neither. Dropped at
  a specific point among the bar's existing chips, it's inserted there, not
  appended.
- Chips in the group-by bar are now draggable to reorder the stack, and each
  chip is its own focusable stop — focus one and press `Ctrl+ArrowLeft`/
  `Ctrl+ArrowRight` to move it, mirroring a column header's own reorder
  shortcut.
- `groupToggleIconColumns` (grid-level) / `ColumnDefinition.groupToggleIcon`
  (per-column) hide a groupable header's group-toggle icon without touching
  its capability — `Alt+ArrowDown` keeps working with the icon hidden.
- `groupByBarVisibility` (`"always" | "auto" | "never"`, default `"auto"`)
  controls when the group-by bar renders, decoupled from `groupableColumns`.
  `"auto"` shows it once `groupBy` is non-empty, or while a header drag
  eligible to drop into it is in progress, so there's a drop target even
  from a fully empty grouping.

**Breaking**: the group-by bar's visibility no longer follows
`groupableColumns` — it's governed by the new `groupByBarVisibility` alone.
A grid grouping purely programmatically (`defaultGroupBy` with
`groupableColumns` off) previously showed no bar; under the new `"auto"`
default it now does once `groupBy` is non-empty. Pass
`groupByBarVisibility="never"` to keep the previous behavior.

Internally, `useColumnDrag`'s pointer-drag mechanics are extracted into a
new, reusable `useDragReorder` hook shared with the group-by bar's own chip
dragging — no change to any existing public API.
