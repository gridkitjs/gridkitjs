---
"@gridkitjs/react": patch
---

Resizing a column, or the grid's width changing, no longer re-runs filtering,
sorting, grouping and aggregation: `DataGrid` now derives what it shows through
`createGridViewResolver` from `@gridkitjs/core`, whose row stages ignore column
widths. Large datasets resize without stutter; nothing else changes.
