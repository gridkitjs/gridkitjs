---
"@gridkitjs/core": minor
---

Two built-in commands for a column's filter menu, both shown on the header of
a column `resolveColumnFilterMenu` gives a menu: `filter.open` asks the host
to open it — `host.openPanel("filter", target)` — and `filter.clear`, enabled
while `isColumnFiltered`, takes every entry about the column out of the
filter. `defaultContextMenu.header` lists both after the sort commands.

`GridPanelKind` gains `"filter"`, and `GridCommandSource` gains
`"filterMenu"`, for the sort and clear commands a filter menu runs. A switch
over either that covers every member needs the new case.

`buildKeyShortcuts` takes `filterable`, naming `Alt+Shift+ArrowDown` — the key
that opens a header's filter menu.

`GridMessages` gains `openFilter` ("Filter…"), `clearColumnFilter` ("Clear
filter"), `filterMenuLabel(columnName)` ("Name filter"), `columnFiltered`
("Filtered"), `applyFilter` ("OK"), `cancelFilter` ("Cancel"), `customFilter`
("Custom filter") and `filterResults(shown, total)` ("3 of 10 rows").
