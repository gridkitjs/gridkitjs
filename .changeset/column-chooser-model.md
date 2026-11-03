---
"@gridkitjs/core": minor
---

A column chooser model and the built-in `column.choose` command, which asks
the renderer to open the column chooser panel —
`host.openPanel("columnChooser", target)` — on the grid, a toolbar or a
header target. `resolveColumnChooser({ columns, visibility, search })` lists
every data column for a search, hidden ones included, with whether each is
shown and whether its checkbox is disabled (not `hideable`, or the last
column shown), the tri-state of a "Show all" checkbox over the hideable
columns the search lists, and which columns toggling it shows or hides —
never one that is not `hideable`, and never the last column shown.

`GridMessages` has new keys: `chooseColumns`, the command's label;
`columnChooserLabel`, `columnChooserSearchLabel`, `showAllColumns` and
`noMatchingColumns` for the chooser; and `columnsShown(count)` and
`columnsHidden(count)`, announced when one change shows or hides more than one
column.
