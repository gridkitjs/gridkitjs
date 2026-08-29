---
"@gridkitjs/react": minor
---

`height`: bounds the row area to a fixed size, independently scrollable — the group-by bar, header, footer, and pager stay outside it and always visible.

```tsx
<DataGridComponent columns={columns} dataSource={rows} height={400} />
```

A number is pixels; a string is passed through as a CSS length (e.g. `"60vh"`). Omitted, the body's height stays content-driven, exactly as before this prop existed.

Breaking: the header, body, and footer now render as three separate `<table>`s — `.gridkit-data-grid-header`, the body's own (wrapped in a new `.gridkit-data-grid-body` scroll container), and `.gridkit-data-grid-footer` — inside a new `.gridkit-data-grid-tables` wrapper `<div>` that now carries `role="grid"`/`"treegrid"` and the grid's other grid-level ARIA attributes. Previously all three sat inside one `<table>`, which itself carried that role. This only matters to a consumer whose own CSS or tests reach into the grid's raw table structure (unsupported usage, but possible) — every cell-level role, and everything reachable through `DataGridApi`, is unchanged. One exception: `DataGridApi.table` now points at the body's `<table>` specifically (the one holding `<tbody>`) rather than a single table that also held the header and footer.
