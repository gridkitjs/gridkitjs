---
"@gridkitjs/react": patch
---

Keyboard navigation in a `virtualized` grid now moves the browser's focus to
the cell it lands on once the grid has scrolled. Before, the focus could stay
on the previous cell, or jump to a different row, while the highlighted cell
moved on.
