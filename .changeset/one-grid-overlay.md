---
"@gridkitjs/react": minor
---

The context menu and the grid's panels (the column chooser and a column's
filter menu) are now open one at a time, through the ref as well as in the
grid. Before, `openColumnChooser()` or `openFilterMenu(columnId)` called while
a context menu was open left both open; now the panel closes the menu, which
reports `onContextMenuOpenChange({ open: false, target })`. Likewise
`openContextMenu(target)` closes a panel open.
