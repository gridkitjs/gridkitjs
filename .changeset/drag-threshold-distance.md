---
"@gridkitjs/dom": patch
---

`startDragReorder` opens a drag once the pointer has travelled 4 pixels in any
direction, as documented. It used to count horizontal travel only, so a header
dragged straight up toward the group-by bar never opened a drag.
