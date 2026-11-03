---
"@gridkitjs/dom": minor
---

`attachOverlay` takes `ignoreScrollAfterInput`: when `true`, a scroll outside
the panel in the two animation frames after an `input` or `change` event inside
it does not dismiss it, so a panel whose controls change the page under it is
not closed by what they cause. Every other scroll outside the panel still
dismisses it, and without the option nothing changes.
