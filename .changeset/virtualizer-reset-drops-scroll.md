---
"@gridkitjs/dom": patch
---

`createRowVirtualizer`'s `resetHeights` drops a `scrollToIndex` still waiting
for its row to mount. A scroll asked for just before a sort or filter used to
scroll to whichever row took that index once it mounted.
