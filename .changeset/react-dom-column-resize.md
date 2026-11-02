---
"@gridkitjs/react": patch
---

A right-button (or any non-primary) press on a column's resize handle no
longer starts a resize. Resizing otherwise works as before, now through
`@gridkitjs/dom`'s `startColumnResizeGesture`.
