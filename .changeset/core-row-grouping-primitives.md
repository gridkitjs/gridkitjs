---
"@gridkitjs/core": minor
---

Row grouping primitives: `groupRows` reshapes filtered/sorted rows into a flat, depth-first list of group headers and data rows, stacked outer-to-inner by a `GroupByState`. New exports: `groupRows`, `groupRowId`, `toggleGroupExpansion`, `expandAllGroups`, `collapseAllGroups`, and the types `GroupByState`/`GroupByEntry`/`GroupByEvent`/`GroupExpansionState`/`GroupExpansionEvent`/`ResolvedGroupRow`/`DisplayRow`. `ColumnDefinition` gains a `groupable` field, mirroring `sortable`.

Breaking: `KeyShortcutCapabilities` (consumed by `buildKeyShortcuts`) gains a required `groupable: boolean` field.
