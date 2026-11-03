# @gridkitjs/react

React data-grid components built on
[`@gridkitjs/core`](https://www.npmjs.com/package/@gridkitjs/core) for the
grid's logic and [`@gridkitjs/dom`](https://www.npmjs.com/package/@gridkitjs/dom)
for its browser behaviours. Both are installed with it.

> **Early development.** The API is still moving and may break between minor
> versions.

```bash
pnpm add @gridkitjs/react
```

```tsx
import { defineColumnsFromRows } from "@gridkitjs/core";
import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";

const rows = [
  { Id: 1, Application: { Id: 9, Name: "Portal" }, Cost: 1250.5 },
  { Id: 2, Application: { Id: 4, Name: "Admin" }, Cost: 87.25 },
];

type Row = (typeof rows)[number];

const columns: readonly ColumnDefinition<Row>[] = [
  ...defineColumnsFromRows(rows),
  {
    field: "Cost",
    id: "Cost.currency",
    type: "currency",
    header: "Cost",
  },
];

<DataGrid
  dataSource={rows}
  columns={columns}
  getRowId={(row) => String(row.Id)}
  label="Application costs"
  resizableColumns
  resizeMode="fit"
  selectable={{ rows: "multiple", cells: "single" }}
  onRowSelectionChange={({ selected }) => persist(selected)}
/>;
```

Columns can be inferred from the data or declared outright — a column's `type`
drives its default alignment. With `resizableColumns`, a column edge can be
dragged to resize or double-clicked to fit its content. `resizeMode="fit"`
keeps columns filling the grid; `"fixed"` lets each keep its own width.

`selectable` says which parts of the grid the user may select and how many of
each — `false`, `"single"` or `"multiple"` per member, off by default. Click
replaces, Ctrl-click toggles, Shift-click takes a range, and thirteen callbacks
report it with the resolved row, column or cell value rather than a bare id.
Give `getRowId` alongside it for data that sorts, filters or pages.

The grid is an ARIA grid: one tab stop, with the arrow keys moving cell to cell
within it, `Ctrl+Arrow` reordering a column and `Alt+Arrow` resizing one. Name
it with `label`, or a screen reader announces only "grid".

`contextMenu` gives headers, cells and group rows a menu of their own — sort,
group, autofit, hide and choose columns, select and clear, expand and collapse
— and `toolbar` puts a toolbar above the grid, with a search box, "Clear
filters" and "Choose columns" by default. Both list built-in commands by id,
and `commands` adds your own beside them; the column chooser shows and hides
columns from either. `messages` translates every string the grid shows or
announces, and `locale` formats dates and numbers.

Requires React 19.

Full documentation: [github.com/blagojablazhevski/gridkit](https://github.com/blagojablazhevski/gridkit#readme)

## License

MIT © Blagoja Blazhevski
