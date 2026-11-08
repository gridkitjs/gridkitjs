---
"@gridkitjs/dom": minor
---

`DragReorderHandlers` and `ColumnResizeGestureHandlers` take an optional
`signal`, an `AbortSignal`. Aborting it cancels the gesture as Escape does
(`onState(NO_DRAG)` for a drag, `onCancel()` for a resize) and releases its
listeners and pointer capture, so a renderer can end a gesture whose element
goes away mid-drag. With a signal that is already aborted,
`startDragReorder` and `startColumnResizeGesture` start nothing and return
`false`.
