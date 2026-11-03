---
"@gridkitjs/react": minor
---

`DataGrid` takes `commands`, the app's own commands for its menus to list by
id — one with a built-in's id replaces that built-in in every menu listing
it, the defaults included — and `onCommand`, called after a command or an
inline menu item runs from a context menu with `{ commandId, target, source }`.
An item that did not run, being disabled, is not reported. `GridCommand`,
`GridCommandEvent` and `GridContextMenuRequest` are re-exported from
`@gridkitjs/core`.
