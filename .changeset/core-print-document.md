---
"@gridkitjs/core": minor
---

`buildPrintDocument(table, options?)` lays an `ExportTable` out as a printable
document: a heading of the `title`, `subtitle` and `timestamp` set in a new
`PrintOptions`, the table as `toHtmlTable` writes it, and a `footer` line,
every piece of text escaped. It returns a `PrintDocument` — the document's
`title`, its `bodyHtml`, and the `page` it is laid out on with every default
settled: `paperSize` (`"A4"`), `orientation` (landscape for a table of more
than six columns, else portrait), `pageNumbers` (on) and `fitToWidth` (off).
It holds no styles; a renderer prints it.
