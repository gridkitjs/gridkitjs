---
"@gridkitjs/dom": patch
---

`startColumnResizeGesture` reports the end of a drag that brings the column
back to its start width: `onEnd` receives that width, where it used to
receive `null`, so a grid's `onColumnResize` saw the drag's `"move"` events
and never its `"end"`. A click on the handle, which never changes the width,
still reports `null`.
