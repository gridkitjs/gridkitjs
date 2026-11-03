---
"@gridkitjs/react": minor
---

`DataGrid`'s `contextMenu` takes a function for an area, asked each time its
menu opens with the place it opens on, the area's defaults and the grid's
state — to add items, drop or reorder defaults, or give one column or row no
grid menu (`null`). Inline items, submenus and checkable items in a context
menu work as in any grid menu: a submenu opens with ArrowRight, Enter or the
pointer resting on its item, and a checkable item is a `menuitemcheckbox`.
