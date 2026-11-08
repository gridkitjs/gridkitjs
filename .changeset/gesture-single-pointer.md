---
"@gridkitjs/dom": patch
---

`startDragReorder` and `startColumnResizeGesture` follow only the pointer that
started them. A second finger landing mid-gesture used to steer the drag or
resize, and lifting it ended the gesture; its events are now ignored.
