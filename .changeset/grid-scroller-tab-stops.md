---
"@gridkitjs/react": patch
---

`DataGrid` gives its two scroll containers, `.gridkit-data-grid-body` and
`.gridkit-data-grid-viewport`, `tabindex="-1"`. In Chromium and Firefox,
which make an element that scrolls focusable, a grid with a `height` had an
extra Tab stop on its body between the header and the next control on the
page, and in Firefox a grid wider than its container had another on the
viewport before the header. Tab now reaches the grid once, on its roving
cell, in every browser.
