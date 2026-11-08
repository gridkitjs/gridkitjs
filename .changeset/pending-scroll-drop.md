---
"@gridkitjs/dom": patch
---

A scroll or focus move still waiting for its row or item to mount no longer
acts once it no longer applies. `createRowVirtualizer`'s `scrollToIndex`
replaces a far scroll still waiting when it is called again, even for a
mounted row, and drops it when `setRowCount` no longer holds its row; the
far row mounting later used to scroll the list back to it. After
`destroy()`, `scrollToIndex` no longer scrolls. `attachChecklist`'s
`setCount` moves a focus move waiting for an item past the new end to the
last item, as it does the focused place, where the item first asked for
used to take focus whenever it mounted later.
