---
"@gridkitjs/core": minor
---

Export formats are pluggable. An `ExportWriter` — `{ format, fileExtension,
mimeType, write(table, context) }`, `write` returning text, bytes or a promise
of either — turns an `ExportTable` into a file's contents; `csvWriter` and
`jsonWriter` ship built in. `exportFile(source, format, options, writers)`
builds the table, runs the format's writer and names the file, returning an
`ExportFile` (`{ fileName, mimeType, content }`), a promise of one for an
asynchronous writer, or `null` for a format with no writer.

Two new grid options go with it: `export`, a `GridExportOptions` holding the
grid's export defaults (every `ExportOptions` field, `fileName` — `"export"`
by default, the extension added — and `csv` / `json` settings), and
`exportWriters`, which registers further formats by `format` and replaces a
built-in writer of the same one. `resolveExportWriters(exportWriters)` gives
every writer a grid has, by format.
