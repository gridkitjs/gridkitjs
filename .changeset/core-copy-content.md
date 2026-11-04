---
"@gridkitjs/core": minor
---

`copyContent(source, request)` builds what the clipboard carries from the
export model: tab-separated text (no byte order mark, no formula guard) and an
HTML table. `request` is a cell (`{ kind: "cell", rowId, columnId }`), a row
(`{ kind: "row", rowId }`) or the selection (`{ kind: "selection" }` — the
selected rows, else the selected columns, else the selected cell). Hidden and
`exportable: false` columns never copy, and a row the filter hides gives
`null`. Three new built-in commands use it: `copy.cell`, `copy.row` and
`copy.selection`, labelled by the new `messages` keys `copyCell`, `copyRow`
and `copySelection`, with the `copy` icon key. The default cell context menu
now starts with the three, then a separator. Two more keys, `copied(count,
unit)` and `copyFailed`, are for a renderer's announcement.
