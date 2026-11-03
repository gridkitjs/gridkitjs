---
"@gridkitjs/core": minor
---

Grid commands: the one implementation behind a menu item, a toolbar button and
a renderer's API. `builtInCommands()` returns the grid's own — sort a column
ascending or descending, clear its sort or all sorting, group and ungroup,
expand or collapse every group, hide or autofit a column, select all rows,
clear the selection, clear filters — each deciding from a `GridCommandContext`
whether it shows and whether it can run, and changing the grid only through
the controller's actions. `resolveCommands(commands)` lays an app's own
commands over them, replacing a built-in of the same id; `createCommandContext`
builds the context for a header, cell, group, toolbar or grid target; and
`runCommand` runs a command only when it is visible and enabled.

`ColumnDefinition` takes `hideable` (default `true`), which the built-in
`column.hide` command honours; `hideColumns` still hides any column.
`GridMessages` has a new key for each built-in label — `sortAscending`,
`groupByColumn(columnName)`, `clearFilters` and the rest.
