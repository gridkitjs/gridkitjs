---
"@gridkitjs/dom": minor
---

Overlays attached with `attachOverlay` now stack in the order they attach, so
a submenu or a picker can open above the overlay it came from.

- Escape asks only the topmost overlay to close, and is now consumed: it is
  taken in the capture phase on `window` with `preventDefault()` and
  `stopPropagation()`, so no other listener on the page hears an Escape that
  closed an overlay. With no overlay open, Escape is left alone.
- A pointer down or a focus move inside an overlay above counts as inside
  every overlay below it.
- Detaching an overlay dismisses the overlays above it with a new
  `OverlayDismissReason`, `"parent"`, and detaches them. A `switch` over the
  reason that must be exhaustive needs a case for it.
