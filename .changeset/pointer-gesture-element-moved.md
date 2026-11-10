---
"@gridkitjs/dom": patch
---

A gesture started by `startDragReorder` or `startColumnResizeGesture` keeps
following the pointer when its element is moved elsewhere in the document
mid-gesture, as a keyed list moves a header when a controlled `columnOrder`
changes during the drag. The browser released the pointer capture on the
move, so the gesture stopped hearing moves and the release: its ghost and
drop marker stayed drawn until the next press or Escape.
