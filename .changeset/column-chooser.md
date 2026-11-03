---
"@gridkitjs/react": minor
---

`DataGrid` has a column chooser: a dialog listing every data column, hidden
ones included, with a checkbox each, a search box and a tri-state "Show all"
over what the search lists. Each change applies at once through `showColumns`
and `hideColumns`; a column with `hideable: false` and the last column shown
cannot be unchecked. It opens from the toolbar's new "Choose columns" button —
`toolbar` alone now lists it after "Clear filters" — and from the header
context menu's new last item, below the header, and from the ref's new
`openColumnChooser()` at the grid's top-end corner. Escape or a click outside
closes it, giving focus back to where it opened from.

Hiding or showing several columns in one change — "Show all", or
`hideColumns` given a list — now announces how many: "3 columns hidden".
