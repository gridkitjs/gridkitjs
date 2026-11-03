---
"@gridkitjs/core": minor
---

`GridOptions` gains `toolbar?: boolean | GridToolbarOptions<Row>`: a toolbar
above the grid, off by default. `true` lists `defaultToolbar` — the search
box, a spacer, "Clear filters" and "Choose columns" — and `{ items, label }` lists your own
entries and names the toolbar for a screen reader.
