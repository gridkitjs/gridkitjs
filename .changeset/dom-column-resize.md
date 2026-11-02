---
"@gridkitjs/dom": minor
---

`startColumnResizeGesture(handle, press, session, { onMove, onEnd, onCancel })`
drags a column's edge with the pointer captured, reporting each width,
`onEnd(null)` for a click that resized nothing, and `onCancel` on Escape. Only
the main button of the primary pointer starts it. `measureColumnContent(table,
columnId)` measures the width a column's widest rendered cell needs.
