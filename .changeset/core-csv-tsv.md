---
"@gridkitjs/core": minor
---

`toCsv(table, options?)` and `toTsv(table, options?)` write an `ExportTable`
as text. CSV is quoted per RFC 4180 and by default starts with a UTF-8 byte
order mark, ends records with CRLF, writes each cell as the grid shows it, and
prefixes a field a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, a
leading tab or carriage return) with `'` — a numeric cell keeps its sign.
`delimiter: "auto"` with a `locale` writes `;` where a decimal is written with
a comma, and `values: "raw"` writes typed values plainly instead. TSV, the
clipboard's plain-text form, is tab-separated with LF line ends, no byte order
mark and no formula guard. Both return a string; making a `Blob` is the
renderer's job.
