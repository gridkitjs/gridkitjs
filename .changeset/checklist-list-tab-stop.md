---
"@gridkitjs/dom": patch
---

`attachChecklist` gives the list `tabindex="-1"`. In Firefox, which makes an
element that scrolls focusable, the scrolling list was a tab stop of its own
before its items, and the arrow keys, Home and End did nothing there; the
list is now one tab stop, on its item, in every browser. This fixes the
filter menu's value checklist in `@gridkitjs/react` too.
