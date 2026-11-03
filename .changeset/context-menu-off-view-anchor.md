---
"@gridkitjs/react": patch
---

A context menu opened through the ref's `openContextMenu` on a cell the grid has
scrolled out of view opens at the edge of the grid's view nearest that cell,
rather than beside the hidden cell, possibly off the page.
