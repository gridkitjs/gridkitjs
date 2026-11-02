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

## Phases

Status values: `todo` · `in-progress` · `done` · `blocked` · `skipped`.

Model values: `opus` (phases that design or change code or architecture) · `sonnet` (mechanical
phases). An effort word may follow (`opus xhigh`, `sonnet low`); none means `high` for opus and
`medium` for sonnet.

| #   | Phase                                                | Plan                                                             | Status      | Depends on | Model       | Branch                      | Commits          |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------- | ----------- | ---------- | ----------- | --------------------------- | ---------------- |
| 01  | Boundaries and hygiene                               | [phase-01-boundaries-hygiene.md](phase-01-boundaries-hygiene.md) | done        | none       | opus medium | refactor/boundaries-hygiene | 4ccb606..3c788d8 |
| 02  | `resolveGridView` and the width-free pipeline        | [phase-02-grid-view.md](phase-02-grid-view.md)                   | in-progress | 01         | opus        | feat/grid-view              |                  |
| 03  | Column model: header, formatting, locale, visibility | [phase-03-column-model.md](phase-03-column-model.md)             | todo        | 02         | opus        |                             |                  |
| 04  | `GridOptions` and `createGridController`             | [phase-04-controller.md](phase-04-controller.md)                 | todo        | 03         | opus xhigh  |                             |                  |
| 05  | Serialisable filters and the filter-editor model     | [phase-05-filters.md](phase-05-filters.md)                       | todo        | 04         | opus        |                             |                  |
| 06  | Row hooks, simple multi-select, messages             | [phase-06-row-hooks-messages.md](phase-06-row-hooks-messages.md) | todo        | 04         | opus        |                             |                  |
| 07  | `@gridkitjs/dom`: behaviours out of React            | [phase-07-dom-package.md](phase-07-dom-package.md)               | todo        | 04         | opus xhigh  |                             |                  |

Phases 05, 06 and 07 are independent of each other and may run in any order after 04.

## Now

- **In progress:** 02
- **Next:** 03
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

## Follow-ups

- [phase 03] Once `ColumnDefinition.header` exists, switch `README.md` (~line 68) and
  `packages/react/README.md` (~line 26) back from `headerTemplate: "Cost"` to `header: "Cost"`.
- [phase 07] Add `@gridkitjs/dom` to core's ESLint import ban and ban `react` in
  `packages/dom/**` (`eslint.config.mjs`).
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
