---
"@gridkitjs/core": patch
---

The controller calls its subscribers only when an action changed the state.
An action on a controlled slice that only asks for a change fires the slice's
callback but no longer wakes every subscriber with the same state, and
`clearSelection` or `restoreState` call them once at the end only if some
slice changed.

`onContextMenuOpenChange`'s doc comment names every way the menu closes on
its own: a panel opening in its place, the grid unmounting and `contextMenu`
being turned off.
