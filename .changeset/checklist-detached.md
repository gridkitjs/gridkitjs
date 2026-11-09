---
"@gridkitjs/dom": patch
---

An `attachChecklist` checklist does nothing once `detach()` has run. Its
`focusItem` used to still scroll the list and report the move through
`onFocusChange`, and a later `setCount` could focus the item that move had
asked for.
