---
"@gridkitjs/core": minor
---

`toJson(table, options?)` writes an `ExportTable`'s data rows as a JSON array
of objects, one property per column holding the cell's typed value — dates as
ISO 8601 strings. Group, summary and total rows are left out. Properties are
named by column id, or by header text under `keys: "header"`, where a
repeated header is suffixed ` (2)`; `space` indents the output.
