---
"@gridkitjs/react": minor
---

`contextMenu` now opens on data cells and group rows as well as headers.
A cell's menu ("Row menu") selects every row or clears the selection, and in a
grouped grid expands or collapses every group; a group row's ("Group menu")
expands or collapses every group and stops grouping by its column. Opening
one on a row or cell that is not selected selects it first, where rows or
cells are selectable — opening it inside the selection keeps the selection —
and focus moves to the cell, which gets it back when the menu closes. List an
area's items with `contextMenu={{ cell: [...], group: [...] }}`, or `[]` for
the browser's menu there. The body's empty space opens a menu once
`contextMenu.body` lists one; a group's summary row, the footer and the pager
keep the browser's menu.

While cells or group rows open a menu, their `aria-keyshortcuts` lists
`Shift+F10`.
