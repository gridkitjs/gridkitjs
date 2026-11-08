---
"@gridkitjs/react": patch
---

A virtualized `DataGrid` no longer scrolls back and pulls focus into a row a
keyboard move asked for when focus has left the grid, or the body was
scrolled or pressed, before that row mounted.
