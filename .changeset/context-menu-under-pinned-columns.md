---
"@gridkitjs/react": patch
---

`openContextMenu`, and Shift+F10 on a focused cell, open a cell's menu at
the edge of the pinned columns when the cell is scrolled under them, as they
already did for a cell scrolled out of view. The menu opened below a cell
nobody could see.
