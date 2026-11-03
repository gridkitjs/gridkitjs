---
"@gridkitjs/core": minor
---

A `contextMenu` grid option for the grid's own context menu on column
headers, off by default. `true` shows the defaults — `defaultContextMenu`:
sort ascending and descending, clear the sort, group by and stop grouping,
autofit the column or all of them, hide it, and choose the columns shown,
each where the column allows;
`{ header: entries }` lists a header's menu in the menu vocabulary, and
`{ header: [] }` leaves the browser's menu.

`buildKeyShortcuts` takes an optional `contextMenu` capability, which adds
`Shift+F10`. `GridMessages` has three new keys: `headerMenuLabel(columnName)`,
a header menu's accessible name, and `columnHidden(columnName)` and
`columnShown(columnName)`, announced when one column is hidden or shown.
