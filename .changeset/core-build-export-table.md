---
"@gridkitjs/core": minor
---

`buildExportTable(source, options?)` turns the grid's view into an
`ExportTable` — columns, every row as cells carrying both the formatted text
and a typed value, group header and summary rows, and the grand total — the
one model every export format, the clipboard and print are written from. It
reads the view and state, never the page, so rows on another page or inside a
collapsed group still export. By default it holds every filtered and sorted
row, every group expanded, and the visible columns less any with
`exportable: false`; `ExportOptions` narrows it with `scope`, `columns`,
`includeGroups`, `includeAggregates` and `includeHeader`. A command passes its
`GridCommandContext` as the source as it is.
