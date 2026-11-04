---
"@gridkitjs/react": minor
---

The grid copies to the clipboard, as tab-separated text and an HTML table, so
a paste into a spreadsheet keeps the columns. With `contextMenu` on, the cell
menu now starts with Copy cell, Copy row and Copy selection. Ctrl+C (Cmd+C on
a Mac) in the grid copies the selection, else the focused cell — but not in a
text field inside a cell or while text is highlighted on the page, which stay
the browser's. `runCommand("copy.selection")` copies from code. A screen reader
hears what was copied ("3 rows copied") or "Copy failed".
