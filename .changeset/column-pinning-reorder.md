---
"@gridkitjs/core": minor
---

`moveColumn` keeps a column among those pinned to the same edge, or among the unpinned ones: a target in an earlier group moves it to the start of its own group, and one in a later group to its end, so dragging never pins or unpins a column. A move held at its group's edge changes nothing and reports nothing. Grids with no pinned columns move exactly as before. `@gridkitjs/core/renderer` adds `moveColumnInPinGroup(orderedIds, pinOf, movedId, beforeId)`, the same rule on a plain id list.
