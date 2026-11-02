---
"@gridkitjs/react": patch
---

In a `virtualized` grid, a key that moves focus to a row outside the mounted
window (such as Ctrl+End) no longer gets stuck without scrolling when it is
pressed while the grid is still updating from a scroll.
