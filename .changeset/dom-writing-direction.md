---
"@gridkitjs/dom": minor
---

Gestures, keys and overlays follow the page's writing direction. The new
`writingDirection(element)` returns `"ltr"` or `"rtl"` from an element's
computed `direction`, read afresh on every call. Under `dir="rtl"`:

- `startColumnResizeGesture` grows a column as its left edge is dragged
  leftward, the edge being the column's inline end.
- `resolveColumnDropTarget` and `resolveGroupByDropTarget` drop before a
  header or chip when the pointer is over its right half.
- `attachToolbar` moves to the next control on `ArrowLeft`, and
  `attachMenu` opens a submenu on `ArrowLeft` and closes one on
  `ArrowRight`.
- `placeOverlay` takes an optional `direction` that mirrors the placement:
  `"bottom-start"` lines up with the anchor's right edge and `"right-start"`
  opens to its left. `attachOverlay` defaults it to the panel's own
  direction.
- `GridFocusController.handleKey` takes an optional `direction` as its
  fourth argument, which the left and right arrows follow.

Left-to-right pages are unaffected.
