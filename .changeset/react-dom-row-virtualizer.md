---
"@gridkitjs/react": patch
---

`virtualized` runs on `@gridkitjs/dom`'s `createRowVirtualizer`. Rows window,
measure and scroll as before; scrolling that keeps the same rows mounted no
longer re-renders the grid.
