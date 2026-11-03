---
"@gridkitjs/dom": minor
---

`ToolbarOverflowItem` takes an optional `label`. When `update` finds an entry's
label changed while it was in "More", `observeToolbarOverflow` forgets the
width it remembered for it and measures it afresh, so an entry whose label grew
shorter comes back out of "More" once it fits. `resolveToolbar`'s items carry
their labels already.
