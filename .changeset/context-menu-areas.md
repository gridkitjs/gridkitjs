---
"@gridkitjs/core": minor
---

`contextMenu` has three more areas beside `header`: `cell`, a data cell's
menu, acting on its row and cell; `group`, a group header row's; and `body`,
the body's empty space. `defaultContextMenu` gives `cell` select all rows,
clear the selection, and expand or collapse every group; `group` expand or
collapse every group and stop grouping by its column; and `body` nothing, so
empty space keeps the browser's menu until it is given entries.
`GridContextMenuTarget` is a command target in one of the four areas.

`GridMessages` has three new keys naming these menus: `cellMenuLabel` ("Row
menu"), `groupMenuLabel` ("Group menu") and `bodyMenuLabel` ("Grid menu").
