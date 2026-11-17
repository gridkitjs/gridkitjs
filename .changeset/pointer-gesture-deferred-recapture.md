---
"@gridkitjs/dom": patch
---

A column drag whose own header the renderer moves mid-drag no longer hangs
Safari. `startDragReorder` and `startColumnResizeGesture` take pointer
capture back in a task of their own after the browser releases it, rather
than from inside `lostpointercapture`, which WebKit answered by hanging the
page on the next pointer move. A pending recapture is dropped when the
gesture ends, is cancelled or its `signal` aborts.
