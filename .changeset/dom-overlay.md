---
"@gridkitjs/dom": minor
---

`attachOverlay(anchor, panel, { placement, gap, onDismiss, returnFocusTo })`
positions a panel beside an element or a point — flipping to the other side or
edge when it would run off screen — moves focus into it, and reports
`onDismiss` on Escape, a pointer down outside it, a scroll, a resize or focus
leaving it. Detaching returns focus. `placeOverlay` is the placement
arithmetic on its own.
