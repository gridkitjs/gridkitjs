---
"@gridkitjs/core": minor
---

A toolbar model, written in the menu vocabulary. A `ToolbarEntry` is any
`MenuEntry` — a command id is a button, a checkable one a toggle, a submenu a
dropdown — plus `"search"`, `"spacer"` and `{ type: "custom", id }` for a
renderer's own content. `resolveToolbar(entries, { commands, contextFor })`
resolves them by `resolveMenu`'s rules, each item in a context targeting
`{ area: "toolbar", itemId }`, and separators also collapse beside a spacer.
`GridToolbarOptions`, `defaultToolbar` (search, spacer, `filter.clearAll`) and
`toolbarEntries(toolbar)` describe the coming `toolbar` grid option.

For a toolbar too narrow for its items, `fitToolbarItems` works out how many
fit — pinned entries (search and custom, see `isPinnedToolbarItem`) always
stay, and room for a "More" button is kept only when something overflows —
and `splitToolbarItems` splits the resolved items into what stays and the
"More" menu's entries.

A menu or toolbar entry naming no command is now reported as "the menu or
toolbar entry `id` names no command, so it is left out."
