---
"@gridkitjs/react": minor
---

`DataGrid` takes `onContextMenuOpenChange`, called as its context menu opens
or closes with `{ open, target }`, and `DataGridApi` has four new members:

- `openContextMenu(target, anchor?)` opens the menu a header, cell, group row
  or the body's empty space has, as a right-click there would — selecting and
  focusing the cell first — beside a point or an element, or else below the
  cell. It returns whether it opened.
- `closeContextMenu()` closes it.
- `runCommand(commandId, target?)` runs a built-in or app command on a
  target, `{ area: "grid" }` by default, when it is visible and enabled there,
  firing `onCommand` with `source: "api"`, and returns whether it ran.
- `autoFitColumns(columnIds?)` sizes the columns given, or every column
  shown, to their content.

`openContextMenu` renders nothing synchronously, so it is safe to call from an
effect. `GridCommandTarget`, `GridContextMenuTarget` and
`ContextMenuOpenChangeEvent` are re-exported from `@gridkitjs/core`.
