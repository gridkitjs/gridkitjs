<p align="center">
  <img src="assets/gridkit-header.svg" alt="GridKit" width="50%">
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@gridkitjs/core"><img src="https://img.shields.io/npm/v/%40gridkitjs%2Fcore?label=Core&logo=npm" alt="Core"></a>&nbsp;
  <a href="https://www.npmjs.com/package/@gridkitjs/react"><img src="https://img.shields.io/npm/v/%40gridkitjs%2Freact?label=React&logo=npm" alt="React"></a>&nbsp;
  <a href="https://www.npmjs.com/package/@gridkitjs/theme-tailwind"><img src="https://img.shields.io/npm/v/%40gridkitjs%2Ftheme-tailwind?label=Tailwind%20Theme&logo=npm" alt="Tailwind Theme"></a>&nbsp;
  <a href="https://gridkitjs.com"><img src="https://img.shields.io/badge/docs-gridkitjs.com-blue" alt="Docs"></a>
</p>

---

# GridKit

Headless data-grid toolkit. pnpm monorepo, ESM-only, TypeScript 6.

Grid logic lives in `@gridkitjs/core` as plain TypeScript, so it is testable
without a DOM and reusable from a future Vue/Svelte adapter. `@gridkitjs/react`
binds that logic to React components.

## Documentation

Guides and full API reference live at **[gridkitjs.com](https://gridkitjs.com)**:

- [Core](https://gridkitjs.com/en/docs/core/overview) — column inference, resizing, ordering, selection
- [React](https://gridkitjs.com/en/docs/react/overview) — components, props, events
- [Theme (Tailwind)](https://gridkitjs.com/en/docs/theme-tailwind/overview) — palette tokens, dark mode

The `.mdx` sources live in this repo under each package's `docs/` folder, but
this repo has no docs build — they're only rendered by the separate
`gridkit-website` repo.

## Packages

| Package                     | What it is                                                                                    | Docs                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `@gridkitjs/core`           | Framework-agnostic grid logic — column resolution, alignment, sizing.                         | [docs](https://gridkitjs.com/en/docs/core/overview)           |
| `@gridkitjs/react`          | React components consuming `core`, styled with Tailwind utilities.                            | [docs](https://gridkitjs.com/en/docs/react/overview)          |
| `@gridkitjs/theme-tailwind` | Tailwind theme layer — palette tokens, dark mode, grid styles.                                | [docs](https://gridkitjs.com/en/docs/theme-tailwind/overview) |
| `@gridkitjs/theme-default`  | Plain CSS for consumers not using Tailwind. Currently an empty stub, private and unpublished. | —                                                             |

`apps/playground` is a Vite app used to develop against. Private, never published.

## Installation

```bash
npm install @gridkitjs/core @gridkitjs/react

# Tailwind consumers additionally:
npm install @gridkitjs/theme-tailwind
```

## Usage

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

Columns can be inferred from the data with `defineColumnsFromRows`, or declared
outright — a column's `type` drives its default alignment. With
`resizableColumns`, a column edge can be dragged to resize or double-clicked to
fit its content. `resizeMode="fit"` keeps columns filling the grid; `"fixed"`
lets each keep its own width.

### Selection

`selectable` says which parts of the grid the user may select and how many of
each — `false`, `"single"` or `"multiple"` per member, and off by default since
selection claims the click. Cells take `false | "single"`: a cell addresses one
value, so there is no range to take.

Click replaces, Ctrl-click toggles, Shift-click takes a range. Thirteen
callbacks report it, each carrying the resolved row, column or cell value rather
than a bare id: `onRowSelect` / `onRowsSelect` / `onRowDeselect` /
`onRowsDeselect` / `onRowSelectionChange`, the same five for columns, and
`onCellSelect` / `onCellDeselect` / `onCellSelectionChange`.

Give `getRowId` alongside it for data that sorts, filters or pages. Without one
a row is identified by its position, so a re-sort would leave the same positions
selected under different rows.

### Accessibility

The grid is an ARIA grid: one tab stop, with the arrow keys, Home, End,
`Ctrl+Home`, `Ctrl+End` and the page keys moving cell to cell within it. Rows
and cells report `aria-selected`, and reorders, resizes and bulk selections are
announced through a live region.

| Keys                               | What they do                    |
| ---------------------------------- | ------------------------------- |
| Arrows, Home, End, PageUp/PageDown | Move the focused cell           |
| `Ctrl+Home` / `Ctrl+End`           | First and last cell of the grid |
| Space / Enter                      | Toggle or replace the selection |
| `Ctrl+A` / Escape                  | Select every row / clear        |
| `Ctrl+Arrow` on a header           | Reorder the column              |
| `Alt+Arrow` on a header            | Resize the column               |

Give the grid an accessible name with `label`, or `labelledBy` for a heading
already on the page — without one a screen reader announces only "grid".

## Development

```bash
pnpm install
pnpm dev          # playground on http://localhost:5173
```

Packages resolve to **source** locally — `exports` points at `src/index.ts` and
is swapped to `dist` at publish time via `publishConfig`. Editing a package file
hot-reloads the playground immediately; never build to see a change.

## Tests

Vitest for logic in `core` and `react`; Playwright component tests
(Chromium only) for `react`'s `DataGrid`, mounting it in isolation against
the real Tailwind theme rather than jsdom.

```bash
pnpm test                              # Vitest, all packages
pnpm --filter playground test:e2e        # Playwright, DataGrid only
```

See [AGENTS.md](AGENTS.md) for the full contributor guide.

## Standards

CI runs exactly this, in order:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

TypeScript is `strict` with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`; ESLint is flat config, `strictTypeChecked`;
Prettier enforces formatting. ESM only, LF line endings, Changesets for
versioning.

Requires Node 22 or newer. See [AGENTS.md](AGENTS.md) for the full contributor
guide.

## License

[MIT](LICENSE) © Blagoja Blazhevski
