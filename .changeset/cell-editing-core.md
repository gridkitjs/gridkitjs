---
"@gridkitjs/core": minor
---

Cells can be edited. A column opts in with `editable` (`true`, or a
function of the row), and may add `valueParser` (typed text to a value),
`validate` (a message refuses the value) and `editTemplate` (a custom
editor, given an `EditTemplateContext`). The grid never writes the data: a
committed edit is reported once through the new `onCellEditCommit` option,
as a `CellEditCommitEvent` carrying the row, the column's `field`, the new
value and the previous one, and the app passes the new rows.

`GridController` holds the edit outside `GridState`, so `getState()` and the
saved state never include it: `getCellEdit()` returns a `CellEditState`
(`idle`, `editing` or `invalid`, with its `CellEditDraft`), and
`startCellEdit`, `setCellEditDraft`, `commitCellEdit` and `cancelCellEdit`
change it. A commit reads the draft, closes without a report when the value
equals the cell's own, then asks `validate`; a refusal keeps the edit open
as `invalid` with the message. `subscribe` also fires when the edit
changes, and an edit whose cell leaves the page, is hidden or stops being
editable is cancelled without a report.

`isCellEditable(view, cell)` says whether a cell may be edited, and
`parseCellText` and `formatCellEditText` read an editor's text by column
`type` and write it back; the renderer entry gains `isColumnEditable`. The
new message `cellEditUnreadable` asks for the column's kind of value
("Enter a number"). `CellEditState` and `CellEditDraft` may gain members in
a minor release.

The new built-in command `edit.cell` ("Edit cell", the new `editCell`
message, with an `F2` shortcut hint) starts an edit, and shows only on a
cell `isCellEditable` accepts. `defaultContextMenu.cell` now starts with it
and a separator. A grid with no editable column is unchanged, its cell menu
included.
