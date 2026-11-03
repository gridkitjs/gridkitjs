---
"@gridkitjs/core": minor
---

Three new grid options. `commands` registers the app's own commands for its
menus to list by id; one with a built-in's id replaces that built-in wherever
it is listed. `onCommand` is called after a command or an inline menu item
runs, with a `GridCommandEvent` — `{ commandId, target, source }`, `source`
being a `GridCommandSource`: `"contextMenu"`, `"toolbar"` or `"api"`.
`onContextMenuOpenChange` is called as the grid's context menu opens or
closes, with a `ContextMenuOpenChangeEvent` — `{ open, target }`.
