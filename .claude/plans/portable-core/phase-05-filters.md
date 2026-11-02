# Phase 05: Serialisable filters and the filter-editor model

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

Filters become saveable: an operator-based `OperatorFilterEntry` joins the existing four entry
kinds, with fixed null semantics, so a layout can store "amount between 10 and 100" without a
function. Core also gains the headless model every future filter UI ("simple" and "excel")
shares: what shape a column's filter has, the cascaded distinct-value list, and the draft
reducer for a checklist editor. No UI in this phase; the toolbar/menu plans build it.

## Read first

- `DESIGN.md#7`: entry shape, operator list, null semantics, the three model functions and the
  measured costs that justify lazy computation.
- `packages/core/src/util/filtering.ts` (all): the compile-once-per-entry design to extend;
  `isEntryUsable`, `compileFilterEntry`, `setColumnFilter`, `filterQueryFor`.
- `packages/core/src/util/grouping.ts#bucketKey`, `sorting.ts#compareValues`: the equality and
  ordering primitives operators must reuse.
- `packages/core/src/util/format.ts` (Phase 03): labels for values.
- `packages/core/src/util/filtering.test.ts`: the test style.
- `packages/react/docs/columns/column-filtering.mdx`: the doc to extend.

## Starting point

- (From Phase 04) Operator entries need handling in `serializeEntry`/`reviveEntry`
  (`packages/core/src/util/serialize.ts`) and `sameEntry` (`packages/core/src/controller/changes.ts`).
- `FilterEntry<Row>` is `TextFilterEntry | ValueFilterEntry | PredicateFilterEntry |
GroupFilterEntry`; entries are discriminated structurally (`"combinator" in entry`,
  `"predicate" in entry`, `"value" in entry`, else text). An `OperatorFilterEntry` has
  `operator` and sometimes `value`, so discriminate on `"operator" in entry` **before** the
  `"value"` check.
- `ValueFilterEntry` only matches when the column's `type` agrees with the value's kind; keep
  that spirit: operators compare via `compareValues(a, b, column.type)` and treat a type
  mismatch as no match.
- `setColumnFilter`/`filterQueryFor` are text-only helpers; the editor model supersedes them for
  UIs but they stay.
- After Phase 04 the controller has `setFilter` and `serializeGridState`; this phase makes the
  serialised form expressive.

## Tasks

### Part A: operator entries

1. Add `FilterOperator`, `FilterScalar`, `OperatorFilterEntry<Row>` to `types.ts`; extend
   `FilterEntry`. Export from `index.ts`. Acceptance: typecheck.
2. Compile operator entries in `compileFilterEntry` with the semantics of `DESIGN.md#7`:
   text operators case-insensitive on stringified values; comparisons via `compareValues`;
   `between` inclusive; `in` via `bucketKey`; `isEmpty`/`isNotEmpty` treat `null`, `undefined`
   and `""` as empty; `ne`/`notContains` are `true` for empty cells, all other operators
   `false`. A `Date` scalar compares by time; a `Date` column given a string scalar parses it
   with `new Date(string)` (same as `compareValues#toTime`). Acceptance: a table-driven test per
   operator × (string, number, date, boolean column) including empties and type mismatches.
3. `serializeGridState` (Phase 04) passes operator entries through unchanged, including `Date`
   scalars serialised as ISO strings and revived on `restoreState` for `date`/`dateTime`/`time`
   columns. Acceptance: round-trip test. Changeset: `core` minor.
4. Docs: `column-filtering.mdx` gains "The fifth kind: operators", the operator table with null
   behaviour, and a saved-layout example.

### Part B: the filter-editor model

1. `describeColumnFilter(filter, columnId): ColumnFilterShape` →
   `{ kind: "none" } | { kind: "values", values: readonly FilterScalar[], includeBlanks: boolean }
| { kind: "conditions", conditions: readonly OperatorFilterEntry[], combinator: "and" | "or" }
| { kind: "custom" }` per `DESIGN.md#7` (a top-level `in` entry, optionally OR-grouped with
   `isEmpty`, is `values`; one or two operator entries for the column, optionally in one group,
   are `conditions`; anything else touching the column is `custom`). Acceptance: tests for each
   shape and for a column with no entries.
2. `columnValueOptions(rows, dataColumns, filter, columnId, { search?, limit?, locale? })` →
   `{ options: readonly { value; label; count }[], total: number, truncated: boolean }`: computed
   over the rows that pass every entry _except_ those scoped to `columnId` (cascade), bucketed
   with `bucketKey`, sorted with `compareValues`, labelled with `formatCellValue`, filtered by
   case-insensitive `search` on the label, cut at `limit`. Acceptance: tests for cascade,
   counts, sorting by type, search, limit/truncated; a performance guard test over 100k rows
   finishing under 500 ms (loose, to catch quadratic regressions only).
3. `filterEditorReducer(draft, action)` and `initialFilterEditorDraft(shape, options)`:
   actions `search`, `toggleValue`, `toggleAll` (tri-state over the search-visible subset),
   `setIncludeBlanks`, `setConditions`, `clear`; `draftToFilter(draft, columnId, current)`
   returns the next `FilterState` with "everything checked" → the column's entries removed and a
   partial pick → one `in` entry (+ `isEmpty` OR-group when blanks are included). Acceptance:
   reducer tests for every action and the two normalisations; `draftToFilter` then
   `describeColumnFilter` round-trips.
4. Export, changeset (`core` minor), docs: a new `packages/core/docs/filtering.mdx` ("Filter
   state and the editor model", `_meta.json` entry) describing the shapes and the cascade rule,
   and a sentence in `column-filtering.mdx` pointing at it.

## Done when

- [ ] Operator entries filter correctly with the fixed null semantics and serialise/restore.
- [ ] `describeColumnFilter`, `columnValueOptions`, `filterEditorReducer` + draft helpers exist,
      tested, exported.
- [ ] No React changes beyond types flowing through (no UI).
- [ ] Changesets; `filtering.mdx` and `column-filtering.mdx` updated.
- [ ] Full CI sequence green; Playwright suite unchanged and green.
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `pnpm --filter @gridkitjs/core test`: new tests in `filtering.test.ts`,
  `filterEditor.test.ts`.
- `pnpm --filter playground test:e2e`: unchanged pass count.

## Decisions already made

- Operator list, null semantics, `in` via `bucketKey`, cascade rule, normalisation rules:
  `DESIGN.md#7`. Do not add a "not" wrapper entry; negation is per operator.

## Open choices

- Whether `between` accepts an open end (`[10, null]`): default no; use `gte`/`lte`.
- File layout: `util/filtering.ts` grows vs a new `util/filterOperators.ts` and
  `util/filterEditor.ts`: default split into those two new files.

## Out of scope

- Any filter UI, header affordance or popup (next plan). Server-side filtering.

## Suggested commits

- `feat(core): add operator-based filter entries`: Part A 1-3 + tests + changeset.
- `docs(react): document operator filters`: Part A 4.
- `feat(core): add the headless filter-editor model`: Part B 1-3 + tests + changeset.
- `docs(core): add filtering page`: Part B 4.

## Docs to update

- `packages/react/docs/columns/column-filtering.mdx`; `packages/core/docs/filtering.mdx` (new)
  and `packages/core/docs/_meta.json`.
