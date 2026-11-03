---
"@gridkitjs/react": minor
---

`DataGrid` takes a `toolbar` prop: a toolbar above the grid, sticky to its
start edge, written in the context menu's vocabulary. `toolbar` alone shows a
search box, "Clear filters" and "Choose columns"; `toolbar={{ items, label }}` lists command
buttons (a checkable one is a toggle), inline items, dropdowns opening a menu,
separators, a spacer, the search box and custom entries, which the new
`renderToolbarItem(id)` prop draws. Buttons follow the grid's state —
disabled or hidden as their commands say — and fire `onCommand` with
`source: "toolbar"` and the target `{ area: "toolbar", itemId }`.

The search box writes the filter's global text entry once typing rests, or at
once on Enter, empties on Escape, reads its text back from the filter, and
announces how many rows it found. The toolbar is one tab stop the arrow keys
move within, following the WAI-ARIA toolbar pattern. Off by default.

The grid element now carries an `id`, which the toolbar's `aria-controls`
names. `GridToolbarOptions` and `ToolbarEntry` are re-exported from
`@gridkitjs/core`.
