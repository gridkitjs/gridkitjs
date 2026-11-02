---
"@gridkitjs/core": minor
---

`GridOptions` gains `onRowClick` and `onRowDoubleClick`, called with a
`RowPointerEvent` (the row, the column clicked and the modifiers, no DOM
event), and `getRowProps`, which returns a class name and `data-*` attributes
for each data row. `SelectableConfig` gains `toggleOnClick`, under which a
plain click toggles a row instead of selecting it alone, and `intentOf` takes
it as an optional second argument: `intentOf(event, { toggleOnClick: true })`.
