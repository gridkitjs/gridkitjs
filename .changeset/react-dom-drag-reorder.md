---
"@gridkitjs/react": patch
---

A right-button (or any non-primary) press no longer starts a column-header or
group-by chip drag. Dragging otherwise works as before, now through
`@gridkitjs/dom`'s `startDragReorder`.
