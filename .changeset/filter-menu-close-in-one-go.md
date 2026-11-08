---
"@gridkitjs/react": patch
---

`closeFilterMenu` called right after `openFilterMenu`, before the grid has
redrawn, closes the menu just opened rather than leaving it open.
