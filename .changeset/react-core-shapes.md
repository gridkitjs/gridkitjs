---
"@gridkitjs/react": minor
---

**Breaking:** `DataGrid`'s props and handle take core's new shapes. Filter
entries in `filter`, `defaultFilter` and `onFilterChange` carry `kind`;
`defaultGroupExpansion`, `groupExpansion` and the `expansion` in
`onGroupExpansionChange`'s event are `{ mode: "allExpanded" | "allCollapsed";
except: string[] }` instead of a list of collapsed group ids. A grid written
against 0.16 changes those literals and readers; see the `@gridkitjs/core`
0.17.0 notes for the before/after of each. `focusCell(rowIndex, columnIndex)`
and `getFocusedCell()` keep their shape (the header is row `-1`).
