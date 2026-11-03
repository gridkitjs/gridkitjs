---
"@gridkitjs/react": minor
---

`DataGrid` takes a `contextMenu` prop: the grid's own menu on a column header,
opened by a right-click, Shift+F10 or the ContextMenu key, in place of the
browser's. `contextMenu` alone shows the defaults — sort ascending or
descending, clear the sort, group by the column or stop, autofit it or every
column, hide it, choose the columns shown — each only where the column allows
it; `contextMenu={{
header: [...] }}` lists the items. Opening it moves focus to the header, which
gets focus back when the menu closes, and under `selectable.columns` selects
the column first unless it is selected already. Off by default.

While a header opens a menu, its `aria-keyshortcuts` lists `Shift+F10`.

Hiding or showing one column — from the menu, or through the ref's
`hideColumns` and `showColumns` — is now announced in the live region:
"Name, column hidden".

`GridContextMenuOptions` and `MenuEntry` are re-exported from
`@gridkitjs/core`.
