---
"@gridkitjs/dom": minor
---

`startDragReorder(id, grabElement, press, { resolveTarget, onState, onDrop })`
runs a reorder drag: a 4-pixel threshold before it opens, the ghost's
`transform`, and the drop target on every move, reported through `onState` and
reset to `NO_DRAG` when it ends. Only the main button of the primary pointer
starts one. `resolveColumnDropTarget` and `resolveGroupByDropTarget` hit-test
the grid's headers and group-by bar.
