---
"@gridkitjs/core": minor
---

`toHtmlTable(table, options?)` writes an `ExportTable` as an HTML `<table>`
string — column names in `<thead>`, rows in `<tbody>`, the grand total in
`<tfoot>`, every text escaped. It carries the class names
`gridkit-export-table`, `export-group` (with `data-level`) and
`export-group-summary`, and each column's alignment inline so it survives a
paste into a spreadsheet or document. `caption` adds a `<caption>`.
