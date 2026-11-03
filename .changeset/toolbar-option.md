---
"@gridkitjs/core": minor
---

`GridOptions` gains `toolbar?: boolean | GridToolbarOptions<Row>`: a toolbar
above the grid, off by default. `true` lists `defaultToolbar` — the search
box, a spacer and "Clear filters" — and `{ items, label }` lists your own
entries and names the toolbar for a screen reader.
