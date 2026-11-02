# Portable core: master plan

> **To run this plan:** use the `run-plan` skill with this file ("run the plan in
> .claude/plans/portable-core/MASTER.md"). The agent that runs it is a delegator: it asks the
> pre-flight questions once, then runs every phase (or part) in its own sub-agent (on the
> model and effort in the table's Model column), so its own context stays small. Sub-agents
> commit as they go and reply with the standard phase report; the delegator records each
> report here. Written with the `master-plan` skill.

- **Status:** in progress (not started · in progress · done)
- **Created:** 2026-11-01 · **Last updated:** 2026-11-02
- **Goal:** Move GridKit's state, derived view and actions into a framework-free controller in
  `@gridkitjs/core`, and its browser behaviours into a new vanilla `@gridkitjs/dom` package, so
  `@gridkitjs/react` keeps only markup, templates and lifecycle glue and a future Angular/Vue
  renderer is a thin layer over the same core. Along the way add the foundations the next
  features (toolbar, context menu, filter UI, export, print) all need: a single `GridOptions`
  type, controlled-or-uncontrolled state with setters, column formatting/visibility,
  serialisable filters and the headless filter-editor model, row hooks and message strings.
  Behaviour as seen by a user does not change in this plan; the Playwright suite is the proof.

## Shared context

Every phase sub-agent reads these first.

- `AGENTS.md`: the repo's rules (package split, tests, docs-with-code, changesets, commits,
  branches). The quality bar below is this file.
- `.claude/plans/portable-core/DESIGN.md`: the layer model, contracts and settled decisions
  every phase builds on. Phase files cite its sections.
- `packages/core/src/index.ts` and `packages/core/src/types.ts`: the public core API and the
  vocabulary (`*State`, `*Event`, `Resolved*`) new code must match.
- `packages/react/src/DataGrid/DataGrid.tsx`: the orchestration being extracted; read the part
  the phase names.
- `apps/playground/tests-ct/`: the Playwright component suite; `support/mountGrid.tsx` is the
  harness, `support/*Grid.tsx` are fixtures.

Rules that apply to every phase:

- `core` has no React and no DOM; `dom` has no React; `react` decides nothing the user can
  observe, it only draws (DESIGN.md §2). Core must keep running in Node.
- No user-visible behaviour change in this plan. Existing Playwright tests pass unchanged at
  every commit; a test that must change is reported, not silently edited.
- Every change to a published package (`core`, `react`, `dom`, `theme-tailwind`) ships with a
  changeset in the same commit (`pnpm changeset`); new API or changed behaviour is `minor`, a
  pure refactor is `patch`. Docs (`packages/<pkg>/docs/*.mdx`) for new public API land in the
  same change. Use `<Kbd>` for key names in docs.
- Commits: Conventional Commits, subject line only, no body, no `Co-Authored-By` or other
  trailers, never on `main` directly, never mention gitignored or local-only files. One concern
  per commit.
- Keep the repo's style: TypeScript `strict` + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`, ESLint `strictTypeChecked` without disable comments, Prettier.
  Doc comments explain _why_ in the existing voice (see any file under `packages/core/src/util`).
- Prefer tests in `core` (Vitest, `*.test.ts` next to the code) for logic; Playwright CT in
  `apps/playground/tests-ct/` for anything needing a browser; `react` has no Vitest today and
  this plan does not add any.

Quality bar (code is for people to maintain):

- Follow `AGENTS.md` (package boundaries; changeset + docs in the same PR; commit rules).
- Readable over clever: clear names in the project's own vocabulary, small focused units,
  comments that explain why, no dead or commented-out code.
- Leave what you touch tidier, but don't refactor outside the phase.

Verify with:

- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` (exactly what CI
  runs, in order). Core: 327 Vitest tests passing at plan start.
- `pnpm --filter playground test:e2e` (Playwright CT, Chromium). 198 tests at plan start; one,
  `row-virtualization.spec.tsx:116`, fails on Windows under the full parallel run and passes
  serially and on Linux CI — Phase 01 triages it. Anything else failing is a regression.
- `pnpm --filter playground test:e2e:coverage` enforces 80 % line/statement/function coverage over
  the instrumented paths; Phase 07 widens the instrumented set to `packages/dom`.

## Pre-flight

The delegator asks all of these in one round before the first phase, records the answers in
Run settings, and moves confirmed decisions into the repo's docs where they belong.

1. **Branching.** Commit directly on the current branch, one branch per phase, or branches per
   scope (as the `ship` skill splits them)? Push and open PRs at the end? (`main` is protected;
   the repo's own flow is one `feat/`/`refactor/` branch per PR, squash-merged.)
2. **Phases to run.** All remaining phases in this session (default), or only some?
3. **Controlled-state shape (Phase 04).** Per-slice controlled props (`columnSort` +
   `onColumnSortChange`, alongside today's `defaultColumnSort`) as DESIGN.md §5 records, or one
   `state` + `onStateChange` object? Default: per slice.
4. **`@gridkitjs/dom` published (Phase 07)?** Default: yes, public, versioned by changesets like
   the others, so any renderer can depend on it. Alternative: a folder inside `react`.
5. **Rename `DataGridComponent` → `DataGrid`?** Not part of this plan unless asked; pre-1.0 is
   the cheap moment. Default: no rename in this plan (a follow-up).
6. **Flaky test outcome (Phase 01).** If the Windows-only failure turns out to be a timing-
   sensitive test rather than a bug, is making the test wait on a real signal acceptable, or
   should it be reported and left? Default: fix the test's waiting, never `test.skip`/`test.fail`.

## Run settings

(Filled in by the delegator after pre-flight.)

- **Branching:** one branch per phase, each stacked on the previous phase's branch (Phase 01
  branches from `main`).
- **Push / PRs at the end:** yes, via section 3 of the `ship` skill after the last phase.
- **Phases to run:** all (01-07).
- **Confirmed:**
  - Controlled state is per slice (`columnSort` + `onColumnSortChange` alongside
    `defaultColumnSort`), as DESIGN.md §5 records.
  - `@gridkitjs/dom` is a public, published package versioned by changesets.
  - Rename `DataGridComponent` → `DataGrid` **in this plan**: added to Phase 01 as Part C, so
    every later phase uses the new name.
  - Flaky test: if timing-only, fix the test's waiting on a real signal; never
    `test.skip`/`test.fail`.
  - (Asked during Phase 03) Value formatting is opt-in: dates and numbers go through `Intl`
    only when the column has `format` or the grid has `locale`; otherwise they print exactly as
    before the plan.

## Phases

Status values: `todo` · `in-progress` · `done` · `blocked` · `skipped`.

Model values: `opus` (phases that design or change code or architecture) · `sonnet` (mechanical
phases). An effort word may follow (`opus xhigh`, `sonnet low`); none means `high` for opus and
`medium` for sonnet.

| #   | Phase                                                | Plan                                                             | Status      | Depends on | Model       | Branch                      | Commits          |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------- | ----------- | ---------- | ----------- | --------------------------- | ---------------- |
| 01  | Boundaries and hygiene                               | [phase-01-boundaries-hygiene.md](phase-01-boundaries-hygiene.md) | done        | none       | opus medium | refactor/boundaries-hygiene | 4ccb606..3c788d8 |
| 02  | `resolveGridView` and the width-free pipeline        | [phase-02-grid-view.md](phase-02-grid-view.md)                   | done        | 01         | opus        | feat/grid-view              | 1ffa0c7..fa8df01 |
| 03  | Column model: header, formatting, locale, visibility | [phase-03-column-model.md](phase-03-column-model.md)             | done        | 02         | opus        | feat/column-model           | 8bca2fc..6f0cf5b |
| 04  | `GridOptions` and `createGridController`             | [phase-04-controller.md](phase-04-controller.md)                 | done        | 03         | opus xhigh  | feat/grid-controller        | 37815bc..5d52fb9 |
| 05  | Serialisable filters and the filter-editor model     | [phase-05-filters.md](phase-05-filters.md)                       | done        | 04         | opus        | feat/serialisable-filters   | ee1ef74..b47eaca |
| 06  | Row hooks, simple multi-select, messages             | [phase-06-row-hooks-messages.md](phase-06-row-hooks-messages.md) | done        | 04         | opus        | feat/row-hooks-messages     | bcdd2c3..9f0d17a |
| 07  | `@gridkitjs/dom`: behaviours out of React            | [phase-07-dom-package.md](phase-07-dom-package.md)               | in-progress | 04         | opus xhigh  | feat/dom-package            |                  |

Phases 05, 06 and 07 are independent of each other and may run in any order after 04.

## Now

- **In progress:** 07
- **Next:** finish: full verification, move plan to finished/, push and open PRs
- **Waiting on the user:** nothing

## Handoffs

(The delegator copies each report's Handoff section here, under the phase or part it came
from, and passes the relevant ones to the next sub-agent.)

### Phase 01 part A

- Core's restricted-import list is a single array in `eslint.config.mjs`, expanded with
  `flatMap` to `name` and `name/*`; Phase 07 only needs to add a name.
- `react-hooks` rules run only under `packages/react/**` and `apps/**`; a new `packages/dom`
  gets none unless added, which is correct for `dom`.
- `AGENTS.md` still says `DataGridComponent` (Tests section) for Part C to rename.
- Core test files compile without the DOM lib.

### Phase 01 part B

- The flake was real bugs, not timing: (1) spec passed `getRowId` across Playwright CT's
  function-prop bridge, which yields a placeholder, so every row shared one React key; (2)
  `cellAt` in `useGridNavigation.ts` found rows by DOM position, wrong under virtualization (now
  `:scope > tr[data-gridkit-row-index="N"]`); (3) a stale queued effect cleared the one-boolean
  pending-focus marker (now `pendingMove`, holding the exact stored move). Two `react` patch
  changesets; a new regression test (199 Playwright tests now).
- `row-virtualization.spec.tsx` now mounts `support/RowIdentifiedGrid.tsx`, which wraps
  `DataGridComponent`; rename there in Part C.
- CT gotcha: function props passed from a spec never return real values in the browser; use the
  browser-side fixtures under `tests-ct/support/`.
- On this 16-core machine `--repeat-each 5` is too light to show flakes; `--repeat-each 40
--workers 16` on a single test does.

### Phase 01 part C

- The public component is now `DataGrid` (from `@gridkitjs/react`); its types are still
  `DataGridProps<Row>` and `DataGridApi<Row>`. Dev-warning prefixes read `DataGrid: …`.
- Playwright CT count: 199.
- Pending changesets: `use-client-banner`, `pending-focus-move`, `virtualized-focus-row`,
  `rename-data-grid` (react minor).
- `examples/*/src/App.tsx` (8 StackBlitz projects, outside the workspace, on published
  `@gridkitjs/react@^0.8.0`) still use `DataGridComponent` on purpose; leave them.

### Phase 02

- New core exports: `resolveGridView`, `createGridViewResolver`, `resolveDataColumns`, types
  `DataColumn`, `GridState`, `GridView`, `GridViewInput`, `GridViewOptions`, `ResizeMode`
  (moved from react; react re-exports it). All in `packages/core/src/util/view.ts` and
  `types.ts`.
- The resolver returns the same `GridView` object when nothing changed, so it can serve
  directly as a `useSyncExternalStore` snapshot. `GridViewOptions` names copy the props
  (`resizableColumns`, `columnSizeDefaults`, `resizeMode`…) so `GridOptions` can pass
  them through.
- `DataGrid.tsx` holds one resolver (`useState(() => createGridViewResolver<Row, ReactNode>())`)
  and reads `view.*`: `view.columns`, `view.rows`, `view.displayRows`, `view.pageRows` /
  `pageCount` / `pageIndex`, ids from `view.dataColumns`.
- `GridState` has 7 slices: `columnSizing`, `columnOrder`, `columnSort`, `filter`, `groupBy`,
  `groupExpansion`, `pagination`. Visibility and selection slices are not yet there.
- Still in React (Phase 04): column inference (`defineColumnsFromRows` when no `columns`), the
  page reset on filter/sort/group change (the `previous` state in `DataGrid.tsx`),
  `activeAggregates`.
- `collapseAllGroups` now keeps `kind === "group"` only (summary rows were counted as groups).
- New react API: `DataGridApi.getPageRows()`.
- Counts: 348 core Vitest, 200 Playwright CT.
- Coverage gotcha: Playwright CT caches its bundle in `apps/playground/playwright/.cache` without
  keying on `VITE_COVERAGE`; delete that folder before `test:e2e:coverage` or it reports 0 %.

### Phase 03

- `ColumnDefinition` gained `header`, `format`, `valueFormatter` (`(value, row: Row | undefined)
=> string`) and `hidden`; `DataGridProps` gained `locale` (`FormatLocale`).
- `formatCellValue` (optional 4th `row` arg) is in plain mode unless `column.format !==
undefined || locale !== undefined`; `formatAggregateValue` uses `toLocaleString()` for numbers
  in plain mode. Both in `packages/core/src/util/format.ts`.
- `GridState` has 8 slices; `columnVisibility` (required; `true` = shown, entries only for
  changed columns) added. React holds it as `visibility` useState, changed through
  `useColumnVisibility.ts`. `ColumnVisibilityEvent` is `{ columnIds, visibility }`.
- New core exports: `formatCellValue`, `formatAggregateValue`, `FormatLocale`,
  `resolveColumnHeaderText`, `isColumnVisible`, `applyColumnVisibility`, `setColumnVisibility`,
  types `ColumnVisibilityState`, `ColumnVisibilityEvent`.
- New react API: `defaultColumnVisibility`, `onColumnVisibilityChange`, `getColumnVisibility`,
  `getDataColumns`, `showColumns`, `hideColumns`, `useColumnVisibilityState`, bound
  `DataColumn<Row>`.
- `view.columns` = visible columns, `view.dataColumns` = all. In `DataGrid.tsx`, drops apply to
  `orderedIds` (every id) and resolve against `displayedIds` (visible ids).
- Counts: 411 core Vitest, 209 Playwright CT.
- Gotcha: the Bash tool strips backslashes (`\|` in markdown tables); edit those with
  Edit/Write.

### Phase 04

- `GridOptions<Row>` lives in `packages/core/src/options.ts` (with `Borders`, `HoverableConfig`,
  `GroupByBarVisibility`, `SelectionCallbacks<Row, Node>`); `DataGridProps` = `GridOptions &
ReactRenderSlots & SelectionCallbacks & { ref }`.
- `createGridController` (`packages/core/src/controller/`) owns all 11 slices, every DESIGN §5
  action, the page-reset rule, column inference, controlled-or-uncontrolled per slice.
  `GridControllerOptions` is flat (`GridOptions` + `SelectionCallbacks` + `columns`,
  `viewportWidth`, `onSelectionDiff`). Members are readonly function properties, safe to detach.
- React binds it via `useGridController.ts` (`setOptions` in render, never notifies;
  `useSyncExternalStore` on `controller.getState()`), typed `DataGridController<Row>`. No grid
  `useState` left in `DataGrid.tsx` except `announcement` and two reader memo caches. Focus
  (`nav.focus`) is still React state; `DataGridApi.subscribe` listeners hear of it through an
  effect gated on `[view, state, nav.focus]`.
- Extras beyond DESIGN: `cancelColumnResize`, `onSelectionDiff`/`SelectionDiffEvent`,
  `GridViewState` (type of `resolveGridView`'s `state`), `Serialized*` types; `restoreState` and
  `serializeGridState` (core function, re-exported from react). `selectRows` intent is
  `"replace" | "toggle"`.
- Core has no `console` global; report via `reportError` (`util/report.ts`). Test files declare
  `console` locally. `memoizeLast` moved to `util/memoize.ts` (internal).
  `defineColumnsFromRows<Row, Node>` is generic over `Node`.
- Phase 05 hook points: operator entries need handling in `serializeEntry`/`reviveEntry`
  (`util/serialize.ts`) and `sameEntry` (`controller/changes.ts`).
- Phase 06 hook points: announcement text lives in `DataGrid.tsx` handlers and `countMessage`.
- `DataGrid.tsx` is still ~1180 lines; Phase 07 moves DOM behaviours out.
- Counts: 471 core Vitest, 228 Playwright CT; coverage ~96 % lines.

### Phase 05

- New filter kind: `OperatorFilterEntry<Row>` (required `columnId`, `FilterOperator`,
  `FilterScalar`) in the `FilterEntry` union; compiled by `compileOperatorEntry` in
  `util/filterOperators.ts` (also exports `isEmptyCell`, `toDate`, `isDateType`, `isScalarList`,
  `filterValueKey`).
- Internal `compileFilter(filter, columns)` in `util/filtering.ts` returns `(row) => boolean` or
  `undefined`; `compileFilterEntry` now tests a raw `Row`. `reviveFilter` requires
  `dataColumns` (revives `Date`s only on date/dateTime/time columns).
- Headless filter editor in `util/filterEditor.ts`: `describeColumnFilter`,
  `columnValueOptions` (takes raw rows; returns a `blanks` count), `initialFilterEditorDraft`,
  `filterEditorReducer` (6 actions), `draftToFilter`, `visibleFilterOptions`, `selectAllState`.
  Docs: `packages/core/docs/filtering.mdx`.
- No React source changed in this phase.
- Core `lib` has no `performance` global; use `Date.now()` in tests.
- Counts: 570 core Vitest, 228 Playwright CT.

### Phase 06

- New core exports: `RowPointerEvent`, `RowProps` (`{ className?, attributes? }`, no `style`),
  `GridMessages`, `defaultMessages`, `resolveMessages` (`packages/core/src/messages.ts`);
  `GridOptions` gained `onRowClick`, `onRowDoubleClick`, `getRowProps`, `messages`,
  `selectable.toggleOnClick` (via `intentOf(event, { toggleOnClick })`). React re-exports the
  types.
- Row click/double-click is a delegated DOM behaviour in `GridBody` (`rowPointerEventOf`) —
  a Phase 07 candidate for `dom`. `GridBody` takes `getRowProps`, `onRowClick`,
  `onRowDoubleClick`, `messages`; GridRow gets `rowClassName` + `rowAttributes` (kept stable by
  `createRowPropsResolver` in `packages/react/src/DataGrid/rowProps.ts`).
- Every data `<tr>` carries `data-gridkit-row-id` (stable selector by id).
- `DataGrid` holds `messages = useMemo(resolveMessages(props.messages))`; every built-in string
  and announcement comes from it (`countMessage` removed). `formatCellValue` takes an optional
  5th `messages` argument (boolean text).
- Counts: 582 core Vitest, 238 Playwright CT; coverage ~97 % lines.

## Decisions to review

(Choices sub-agents made that the user should look at, tagged with their phase.)

- [01 A] `AGENTS.md` Tests: the stale six-spec list was replaced with a "one spec file per area"
  sentence (there are 17 specs now).
- [01 B] Race (3) has no deterministic regression test; stress runs (80/80 vs 11/40 failing
  before) are its evidence. Existing `row-virtualization.spec.tsx` mounts were switched to the
  `RowIdentifiedGrid` fixture (assertions unchanged).
- [01 C] `examples/` (8 StackBlitz projects on published `@gridkitjs/react@^0.8.0`) still use
  `DataGridComponent`; renaming them before the release would break their installs.
  Recommended: bump and rename them after the release that ships the rename.
- [02] Column inference from rows stays in React for now (moving it into core needs a cast lint
  rejects); `view.mdx` says so. `resolveGridView` takes raw `rows` + `getRowId`.
- [03] Boolean cells now read "true"/"false" (React used to render them empty, a defect); not
  gated by the opt-in formatting rule. Agent recommends keeping it; Phase 06 `messages` could
  make the text customisable.
- [03] Without `format`/`locale`, a `type: "date"` cell prints date and time
  (`toLocaleString()`), as before. Objects/arrays print as JSON (DESIGN said `String`), keeping
  the old group-header output. A non-text `headerTemplate` on a dotted field is announced
  "Application Id" (was "Application.Id"). `ColumnVisibilityEvent` carries `columnIds` (plural).
- [04] A controlled `pagination` is never reset by a filter/sort/group change (the view clamps
  the page); the alternative needs a callback fired during render. Agent recommends keeping it.
- [04] New controller option `onSelectionDiff` (id-level diff) keeps the "N rows selected"
  announcement exact for off-page ids without changing `RowSelectionChangeEvent`. Alternative:
  add id lists to that public event type. Agent recommends keeping `onSelectionDiff`.
- [04] Setters skip structurally equal values; `setColumnSizing` reports a removed entry at its
  definition width; `resizeColumn` merges into the current sizing, not the drag-start base.
- [05] Operator semantics: `ne`/`notContains` are the exact complement of `eq`/`contains`
  (blanks and wrong-kind cells match them); an operand of the wrong kind matches no row; text
  comparisons are case-insensitive but `in` is case-sensitive (keys by `bucketKey`); `between` is
  inclusive. A custom filter shape opens in the editor as "no filter" and applying replaces it.
- [06] `selectable.toggleOnClick` also applies under `rows: "single"` (clicking the selected row
  deselects it) and makes <Kbd>Enter</Kbd> toggle too. Agent recommends keeping it.
- [06] Message keys are named by area (`previousPage`/`nextPage`), `selectedCount(count, target)`
  takes `"rows" | "columns"`, one `pageStatus` key serves the pager and the announcement;
  symbols (×, …, —) and dev console warnings are not message keys.

## Follow-ups

- [later] `goToPage`/`nextPage` still report when the page doesn't change (old behaviour),
  contradicting `DataGridApi.nextPage`'s "no-op" doc.
- [later] Filter editor: on a date column whose cells are ISO strings, a restored `in` list
  (revived to `Date`s) filters correctly but opens in the checklist with those values unchecked
  (the draft keys by plain `bucketKey`).
- [later] `columnValueOptions` (filter editor) labels booleans "true"/"false" without
  `messages`; aggregate cells (`renderAggregate`) don't use the boolean messages either.
- [phase 07] Row click/double-click handling (`rowPointerEventOf` in `GridBody`) is a candidate
  to move into `dom`.
- [phase 07] Add `@gridkitjs/dom` to core's ESLint import ban and ban `react` in
  `packages/dom/**` (`eslint.config.mjs`).
- [later] `test:e2e:coverage` reuses a stale uninstrumented CT bundle after `test:e2e` and
  still exits 0 with 0 % coverage; the script should clear `apps/playground/playwright/.cache`.
- [after release] Bump `examples/*/package.json` to the react version carrying the rename and
  rename `DataGridComponent` in `examples/*/src/App.tsx`.
- After this plan (next plans in the roadmap): overlay + menu + commands → context menu →
  toolbar → column chooser; filter UIs (`filterableColumns`, `filterMenu: { ui: "simple" |
"excel" }`, an `excelFilter` preset) over the Phase 05 state; export model + CSV/JSON + print,
  then xlsx/PDF writers; the Mabis adapter lives in the Mabis repo, never here.
- `core` sort performance (precomputed sort keys, shared `Intl.Collator`) — not needed yet.

## Log

- 2026-11-01 · plan · created
- 2026-11-02 · pre-flight · answered; rename added to phase 01 as Part C
- 2026-11-02 · phase 01 · started at d2a354f
- 2026-11-02 · phase 01 part A · done · core lib/lint boundary, use-client banner, doc drift (4ccb606..ea49a1d)
- 2026-11-02 · phase 01 part B · done · virtualized focus: two react fixes + spec row ids (76cb977..d126be8)
- 2026-11-02 · phase 01 part C · done · DataGridComponent → DataGrid (cc28980..3c788d8)
- 2026-11-02 · phase 01 · done
- 2026-11-02 · phase 02 · started at 3c788d8 on feat/grid-view
- 2026-11-02 · phase 02 · done · resolveGridView + memoised resolver, DataGrid reads view (1ffa0c7..fa8df01)
- 2026-11-02 · phase 03 · started at fa8df01 on feat/column-model
- 2026-11-02 · phase 03 · user chose opt-in formatting (plain unless format/locale)
- 2026-11-02 · phase 03 · done · header, formatting, locale, visibility (8bca2fc..6f0cf5b)
- 2026-11-02 · phase 04 · started on feat/grid-controller
- 2026-11-02 · phase 04 · done · GridOptions, createGridController, controlled slices, setters (37815bc..5d52fb9)
- 2026-11-02 · phase 05 · started on feat/serialisable-filters
- 2026-11-02 · phase 05 · done · operator filter entries, headless filter-editor model (ee1ef74..b47eaca)
- 2026-11-02 · phase 06 · started on feat/row-hooks-messages
- 2026-11-02 · phase 06 · done · row hooks, toggleOnClick, GridMessages (bcdd2c3..9f0d17a)
- 2026-11-02 · phase 07 · started on feat/dom-package
