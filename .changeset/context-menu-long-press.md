---
"@gridkitjs/dom": minor
---

`attachContextMenuTrigger` also asks for a menu on a touch long-press: a
primary touch resting for half a second without moving, reported as a
`"pointer"` request at the touch's point. A browser's own `contextmenu` for
the same press asks only once, and once the long-press opened a menu, the
click its lifting brings is taken so it does not land in the menu or the cell
under it.
