# Phase 01: Boundaries and hygiene

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

Make the core/renderer boundary mechanical before anything is moved across it: core compiles
without DOM types and cannot import React; React-hooks lint rules apply only where hooks exist.
Fix the small drifts found in the investigation (README example, `AGENTS.md`, a stale comment,
stale core docs), add the `"use client"` banner the React build needs for App Router consumers,
and settle the one locally failing Playwright test. Everything here is free or nearly free, and
makes every later phase self-checking.

## Read first

- `AGENTS.md`: the rules; this phase also edits it (Part A).
- `DESIGN.md#8`: the boundary rules being enforced.
- `tsconfig.base.json`, `packages/core/tsconfig.json`, `eslint.config.mjs`: what core inherits
  today (`lib` includes `DOM`, `jsx: react-jsx`; `react-hooks` rules apply to every package).
- `packages/react/tsup.config.ts`: where the banner goes.
- `apps/playground/tests-ct/row-virtualization.spec.tsx` lines 116-178, and
  `packages/react/src/DataGrid/useRowVirtualizer.ts` (`scrollToIndex`, the pending-scroll ref),
  `packages/react/src/DataGrid/useGridNavigation.ts` lines 160-202 (the pending focus effect that
  retries when the target row is unmounted): the two halves of the flaky interaction.

## Starting point

- Core source (`packages/core/src`, tests excluded) references no DOM global or type today
  (grep for `document|window|HTMLElement|Element|ResizeObserver` finds nothing). Core tests may;
  check `packages/core/src/**/*.test.ts` compile under the narrower `lib` and adjust the test, not
  the lib, if one does.
- `.github/workflows/ci.yml` has two jobs: `ci` (format → lint → typecheck → test → build) and
  `e2e` (`pnpm --filter playground test:e2e:coverage`, 80 % threshold). `AGENTS.md#Standards`
  mentions only the first, `AGENTS.md#Tests` says `column-resize.spec.tsx` has `test.fail()`
  markers (there are none now), and the file has two `## Docs` headings (lines ~39 and ~99).
- `README.md:68` and `packages/react/README.md:26` show `{ field: "Cost", …, header: "Cost" }`;
  `ColumnDefinition` has no `header` field until Phase 03. Use `headerTemplate: "Cost"` now,
  and leave a note for Phase 03 to switch the example back once `header` exists.
- `packages/core/src/index.ts:1` says sorting/filtering/paging "will live here"; they do.
  `packages/core/docs/overview.mdx` says they "are not implemented yet"; they are.
- The failing test: in the full parallel run on Windows it times out (10 s) waiting for
  `Row 199` to be visible after `Control+End` on a 200-row virtualized grid; 3/3 failures in
  parallel, 3/3 passes with `--workers=1`, green on Linux CI. Hypothesis to test: under CPU
  pressure the two-pass `scrollToIndex` (estimate, then correct once measured) and the
  navigation effect's retry do not converge before the deadline, or a real race leaves
  `pendingScrollRef` set without a later recompute.

## Tasks

### Part A: enforce the boundary, fix drift

1. `packages/core/tsconfig.json`: set `"lib": ["ES2025"]` (no `DOM`, no `DOM.Iterable`); core
   has no `.tsx` so the inherited `jsx` setting is harmless, leave it. Acceptance:
   `pnpm --filter @gridkitjs/core typecheck` passes, and a scratch file using `document` fails to
   compile (try it, then delete it).
2. `eslint.config.mjs`: scope `reactHooks.configs.flat.recommended` to `packages/react/**` and
   `apps/**`; add a block for `packages/core/**` with `no-restricted-imports` banning `react`,
   `react-dom` and `@gridkitjs/react` (message: "core is framework-free, see AGENTS.md").
   Acceptance: `pnpm lint` passes; a scratch `import "react"` in core is reported.
3. `packages/react/tsup.config.ts`: add `banner: { js: '"use client";' }`. Acceptance: after
   `pnpm --filter @gridkitjs/react build`, `dist/index.js` starts with the directive. Changeset:
   `react` patch ("works when imported from a Next.js App Router server component tree").
4. Fix `README.md` and `packages/react/README.md` examples (`header` → `headerTemplate`).
5. `AGENTS.md`: under Standards, describe the `e2e` CI job and the coverage threshold; remove the
   `test.fail()` paragraph (or re-verify and keep it accurate); merge the two `## Docs` sections
   (a `## Plans` section already exists; leave it); add the boundary rule from task 1-2 in one
   sentence under Structure.
6. `packages/core/src/index.ts:1` comment and `packages/core/docs/overview.mdx` intro: state
   what core covers today (columns, sizing, ordering, selection, sorting, filtering engine,
   grouping, aggregates, paging, virtualization math, keyboard navigation). Acceptance: no
   sentence in either claims a shipped feature is missing.

### Part B: triage the Windows-only failure

1. Reproduce: `pnpm --filter playground exec playwright test -c playwright-ct.config.ts
row-virtualization --repeat-each 5` and the same with `--workers 1`. Record pass/fail counts.
2. Decide bug vs timing. Read the two hooks named above and trace `Control+End` on a 200-row grid:
   focus moves to row 199 → `cellAt` finds nothing → `virtualRange.scrollToIndex(199)` → range
   recomputes → effect retries. Check whether any path leaves `pending` true with no further
   render, or `pendingScrollRef` set with no later `recompute`.
3. If a race: fix the source (`react` changeset, patch) and add the minimal regression to the same
   spec. If timing only: make the assertion wait on a real signal (the last row's `<tr>` being
   attached, then visible) instead of a fixed text-visibility poll. Never `test.skip`/`test.fail`.
   Acceptance: 5/5 passes under `--repeat-each 5` with default workers on this machine.
4. Report which it was, in one paragraph, in the phase report.

### Part C: rename `DataGridComponent` → `DataGrid`

Confirmed in pre-flight (pre-1.0 is the cheap moment). Breaking for consumers.

1. Rename the exported component `DataGridComponent` to `DataGrid` in `packages/react` (source,
   `src/index.ts`), along with any type named after it, and every use in `apps/playground`
   (`src/`, `tests-ct/`, fixtures, `support/mountGrid.tsx`), READMEs, `AGENTS.md` and
   `packages/*/docs/**/*.mdx`. Grep the repo for `DataGridComponent` (excluding `node_modules`,
   `.history`, `dist`, `CHANGELOG.md`, `.claude/plans`) until nothing is left. No deprecated
   alias: pre-1.0, a clean break with a changelog entry.
2. Changeset: `react` minor, stating the break with a before/after import.
3. Acceptance: full CI sequence and the Playwright suite green; `CHANGELOG.md` history untouched.

## Done when

- [ ] Core compiles with `lib: ["ES2025"]`; `react` import in core is a lint error.
- [ ] `react-hooks` rules no longer run on `packages/core`.
- [ ] `dist/index.js` of `react` begins with `"use client";`, with a changeset.
- [ ] README examples compile against today's `ColumnDefinition`.
- [ ] `AGENTS.md` matches CI and the test suite, has one Docs section, mentions `.claude/plans/`.
- [ ] Stale "not implemented yet" wording removed from core comment and docs.
- [ ] The virtualization spec passes repeatedly in a parallel run; cause reported.
- [ ] Full CI sequence green; Playwright suite green.
- [ ] `DataGridComponent` renamed to `DataGrid` everywhere, with a `react` minor changeset.
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`: all green.
- `pnpm --filter playground test:e2e`: 198 passed, 0 failed (plus any test added in Part B).
- `head -c 40 packages/react/dist/index.js` shows the banner.

## Decisions already made

- Boundary rules: `DESIGN.md#8`. Enforcement is tsconfig + ESLint, no custom scripts.
- The test is never skipped or marked failing (pre-flight 6 default).

## Open choices

- Whether to also ban `@gridkitjs/dom` in core now (package doesn't exist yet): default no;
  Phase 07 adds it.
- Where in `AGENTS.md` the boundary sentence goes: default under the Structure table.

## Out of scope

- Any API addition other than the Part C rename (`header` on columns is Phase 03). Any extraction (Phases 02+).
- Branch cleanup on `origin` (stale branches) — not code.

## Suggested commits

- `build(core): compile without DOM lib`: tsconfig.
- `chore: scope react-hooks lint to renderer packages, ban react in core`: eslint.
- `build(react): add "use client" banner`: tsup + changeset.
- `docs: fix README column example`: both READMEs.
- `docs: bring AGENTS.md in line with CI and tests`: AGENTS.md.
- `docs(core): describe what core covers today`: index comment + overview.mdx.
- `fix(react): …` or `test(playground): …`: Part B, depending on the finding.

- `feat(react)!: rename DataGridComponent to DataGrid`: Part C, with changeset.

## Docs to update

- `AGENTS.md`, `README.md`, `packages/react/README.md`, `packages/core/docs/overview.mdx` (as
  above).
