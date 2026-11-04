---
"@gridkitjs/dom": minor
---

`printDocument({ title, bodyHtml, styles })` prints a document through a
hidden, zero-size frame — its own page, so a print holds exactly what was
built, every row rather than what a virtualised grid has drawn — and resolves
once the print dialog has closed and the frame is removed. One print runs at a
time; a call while one is open resolves without printing. `printStyles(page)`
is the structural stylesheet the frame needs for a `PrintPage` from
`@gridkitjs/core`'s `buildPrintDocument`: paper size and orientation, a header
row repeated on every page, rows kept whole, neutral borders, indented group
headers, and page numbers where the browser draws `@page` margin boxes. Add
rules after it, or pass a stylesheet of your own as `styles`.
