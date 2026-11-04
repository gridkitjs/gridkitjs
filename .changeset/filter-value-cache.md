---
"@gridkitjs/core": minor
---

`createColumnValueOptionsCache()` remembers each column's checklist values, so
reopening a column's filter doesn't count its rows again. Its
`get(rows, dataColumns, filter, columnId, { locale?, messages? })` returns the
column's whole `columnValueOptions` list, and the same object again while the
rows, the columns, the locale, the messages and the filter's entries about
other columns keep their identity. A column's own entries don't count, so
applying its filter leaves its list cached.
