# Phase 03: Column model: header, formatting, locale, visibility

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

Columns gain a plain-text `header`, declarative/functional value formatting with a grid-level
`locale`, and a `hidden` default backed by a `ColumnVisibilityState`. Default cell rendering
goes through one core function, `formatCellValue`, so a `Date` or `boolean` column renders
correctly with no template, aggregates format like their column, and later export/print reuse
the identical text. Today a `Date` cell is rendered as a raw `ReactNode` and throws.

## Read first

- `DESIGN.md#6` (every decision for this phase), `DESIGN.md#4` (hidden columns in the view).
- `packages/core/src/types.ts` lines 1-200 (`ColumnDefinition`, `ColumnType`,
  `ColumnSizingState` — the "defaults in the definition, exceptions in state" pattern to copy).
- `packages/core/src/util/grid.ts` (`resolveColumnLabel`, `alignmentForType`,
  `defineColumnsFromRows`).
- `packages/react/src/DataGrid/components/GridRow.tsx` lines 63-99 (default cell render),
  `components/formatAggregateValue.ts`, `components/GridGroupRow.tsx` (`formatGroupValue`),
  `components/GridFooter.tsx`, `components/GridGroupSummaryRow.tsx`.
- `packages/react/docs/columns/column-definition.mdx`, `column-templates.mdx`: docs to extend.
- `packages/core/src/util/view.ts` (from Phase 02): where visibility is applied.

## Starting point

- `ColumnDefinition.headerTemplate?: Node | (() => Node)`; `resolveColumnLabel` falls back to the
  field path with dots replaced by spaces. `DataGrid.tsx#columnName` uses the label when it is a
  string, else the field — announcements and (later) export have no guaranteed text.
- `GridRow.tsx:96` renders `value as ReactNode` when there is no `cellTemplate`.
- `formatAggregateValue` (react) handles null/Date/number/other generically with
  `toLocaleString()` and no locale; `GridGroupRow` has its own `formatGroupValue`.
- `ColumnType` is `"dateTime" | "date" | "time" | "number" | "string" | "boolean" | "decimal" |
"currency" | "percent"`.
- `resolveGridView` (Phase 02) produces `dataColumns` (all) and `columns` (ordered, sized).
- Phase 01 changed the README example from `header:` to `headerTemplate:`; this phase can switch
  it back to `header: "Cost"`.

## Tasks

### Part A: header text, formatting, locale

1. Add `header?: string` to `ColumnDefinition`. `resolveColumnLabel` returns `headerTemplate`
   when set, else `header`, else the field fallback. Add `resolveColumnHeaderText(column):
string` (header → string label → field fallback) and use it in `DataGrid.tsx#columnName`.
   Acceptance: unit tests for all three fallbacks; the aria announcement for a column with a JSX
   `headerTemplate` and a `header` uses the `header`.
2. Add `format?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions` and `valueFormatter?:
(value: unknown, row: Row) => string` to `ColumnDefinition`; add `locale?: string | readonly
string[]` to the grid options (for now a `DataGridProps` prop; Phase 04 moves it into
   `GridOptions`). Acceptance: types compile under `exactOptionalPropertyTypes`.
3. Implement `formatCellValue(value, column, locale?)` in `packages/core/src/util/format.ts`
   with the rules in `DESIGN.md#6`. Cache `Intl.*Format` instances per (type, locale, format)
   in a module-level `Map` so a 100k-row render does not construct one per cell. Acceptance:
   tests per `ColumnType` incl. null → `""`, Date under `date`/`time`/`dateTime`, `currency`
   with and without `format.currency`, `percent` fraction semantics, boolean, `valueFormatter`
   precedence over `format`, and a fixed `locale` (`"de-DE"`) producing `1.234,5`.
4. Use it: `GridRow` renders `formatCellValue(...)` when there is no `cellTemplate`;
   `GridFooter`, `GridGroupSummaryRow` and `GridGroupRow`'s inline aggregates format through the
   column's `format`/`valueFormatter`/type (delete `formatAggregateValue.ts`; keep the `—`
   dash for an empty aggregate as a renderer choice). Group header values use the grouped
   column's formatting. Acceptance: a CT test in `rendering.spec.tsx` mounts a `Date` column and a
   `boolean` column with no template and asserts the text; existing aggregation/grouping specs
   pass unchanged (if a spec asserted the old `toLocaleString` output for a number, that is an
   expected change — report it).
5. Switch the README examples back to `header: "Cost"`; update `column-definition.mdx` (new
   fields table), `column-templates.mdx` (when a template is still needed), `data-grid.mdx`
   (`locale` prop). Changesets: `core` minor, `react` minor.

### Part B: column visibility

1. Add `hidden?: boolean` to `ColumnDefinition` and `ColumnVisibilityState =
Readonly<Record<string, boolean>>` to `types.ts` and `GridState.columnVisibility` (absent id →
   the definition's `hidden ?? false`). Add `applyColumnVisibility(columns, visibility)` and
   `isColumnVisible(column, visibility)` in `util/visibility.ts`; `resolveGridView` applies it
   after ordering, before sizing (`DESIGN.md#4`). Acceptance: tests: hidden by definition,
   shown by state, hidden by state, stored sort on a hidden column still applies to `rows`,
   hidden column keeps its slot in `columnOrder`.
2. React: `defaultColumnVisibility` prop (uncontrolled, like `defaultColumnSizing`),
   `onColumnVisibilityChange?: (event: ColumnVisibilityEvent) => void` (`{ columnId,
visibility }`), `DataGridApi.getColumnVisibility()`, `showColumns(ids)`, `hideColumns(ids)`,
   `getDataColumns()`; `useColumnVisibilityState` public hook mirroring the other `use*State`
   hooks. `aria-colcount` and `GridColgroup` follow visible columns. Acceptance: CT test in
   `imperative-api.spec.tsx`: hide a column via the API → header count drops, `aria-colcount`
   updates, `onColumnVisibilityChange` fires once; show it again → it returns to its original
   position. Also `reactive-hooks.spec.tsx`: the new hook updates.
3. Docs: `column-definition.mdx` (`hidden`), `imperative-handle.mdx`, `events.mdx`, a short
   "Column visibility" section in `columns/column-definition.mdx` or a new `column-visibility.mdx`
   with `_meta.json` entry. Changesets: `core` minor, `react` minor.

## Done when

- [ ] `header`, `format`, `valueFormatter`, `locale`, `hidden` exist and are documented.
- [ ] `formatCellValue` is the single default renderer for cells and aggregate values.
- [ ] A `Date` column with no template renders text instead of throwing.
- [ ] Visibility state flows through `resolveGridView`; API + hook + event exist.
- [ ] Changesets; docs; README example uses `header`.
- [ ] Full CI sequence green; Playwright suite green (expected changes reported).
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `pnpm --filter @gridkitjs/core test`: `format.test.ts`, `visibility.test.ts` added.
- `pnpm --filter playground test:e2e`: all green; new tests in `rendering`, `imperative-api`,
  `reactive-hooks` specs.
- `node -e` smoke in Node (no DOM): `formatCellValue(new Date(0), { field: "d", type: "date" },
"en-GB")` returns `01/01/1970`.

## Decisions already made

- Formatting rules and fallbacks: `DESIGN.md#6`. Booleans default to `"true"`/`"false"`.
- Hidden columns remain data columns (sort/filter still apply): `DESIGN.md#4`.
- Visibility is uncontrolled-only in this phase; Phase 04 adds the controlled prop.

## Open choices

- Whether `defineColumnsFromRows` infers `format` for anything: default no.
- Name of the visibility doc page: default a section in `column-definition.mdx`.

## Out of scope

- A column chooser UI; `exportable`/`exportValue` (export plan); `messages` for the boolean
  text (Phase 06 may route it).

## Suggested commits

- `feat(core): add header text and formatCellValue`: Part A 1-3 + tests + changeset.
- `feat(react): render cells and aggregates through formatCellValue, add locale`: Part A 4-5.
- `feat(core): add column visibility state`: Part B 1 + changeset.
- `feat(react): add column visibility props, API and hook`: Part B 2-3.

## Docs to update

- `packages/react/docs/columns/column-definition.mdx`, `column-templates.mdx`, `data-grid.mdx`,
  `imperative-handle.mdx`, `events.mdx`; `packages/core/docs/column-definitions.mdx`;
  `README.md`, `packages/react/README.md`.
