---
"@gridkitjs/react": minor
---

New `useSelectionState(gridRef)` hook: row, column, and cell selection read together as one reactive concern off a mounted `DataGridComponent`'s `ref`, with `clearSelection`/`selectAllRows` actions, for a "N rows selected" toolbar living outside the grid's own DOM.
