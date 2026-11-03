# @gridkitjs/core

Framework-agnostic data-grid logic — column resolution, alignment and sizing;
the view pipeline that filters, sorts, groups, aggregates and pages rows; the
grid controller that holds a grid's state; and the models behind its commands,
menus, context menu, toolbar, column chooser and filter editors. Plain
TypeScript, no DOM required, so it is reusable from any framework adapter.

> **Early development.** The API is still moving and may break between minor
> versions.

```bash
pnpm add @gridkitjs/core
```

```ts
import { defineColumnsFromRows, resolveColumnWidths } from "@gridkitjs/core";

const columns = defineColumnsFromRows(rows);
const resolved = resolveColumnWidths(columns, sizing, {
  sizes: { width: 160 },
  resizable: true,
});
```

Each entry in `resolved` pairs a column with everything needed to render it —
`width`, `label`, `resizable` and `alignment` — so an adapter renders what it
is handed rather than re-deriving it.

For React, see [`@gridkitjs/react`](https://www.npmjs.com/package/@gridkitjs/react).

Full documentation: [github.com/blagojablazhevski/gridkit](https://github.com/blagojablazhevski/gridkit#readme)

## License

MIT © Blagoja Blazhevski
