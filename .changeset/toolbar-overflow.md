---
"@gridkitjs/dom": minor
---

`observeToolbarOverflow(toolbar, { items, onChange })` measures a toolbar's
entries and the room it has, and reports how many entries fit — core's
`fitToolbarItems` count — straight away and whenever that changes: as the
toolbar or an entry resizes, or as entries are drawn or taken away. Entries
are found by `data-gridkit-toolbar-item` and the "More" button by
`data-gridkit-toolbar-more`; an entry moved into "More" keeps the width it
was last measured at, a spacer counts as nothing, and the toolbar's padding
and gap are allowed for. It returns `update(options)`, for new items, and
`detach()`.
