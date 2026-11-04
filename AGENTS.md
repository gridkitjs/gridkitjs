# GridKit

Headless data-grid toolkit. pnpm monorepo, ESM-only, TypeScript 6.

## Structure

| Package                                                 | What belongs in it                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/core` (`@gridkitjs/core`)                     | Framework-agnostic grid logic — sorting, filtering, paging. Plain TypeScript. **No React, no CSS.**   |
| `packages/dom` (`@gridkitjs/dom`)                       | Browser behaviours — gestures, focus, observers, overlays. Plain TypeScript with the DOM. No React.   |
| `packages/react` (`@gridkitjs/react`)                   | React components. Renders semantic class names; carries no styles of its own. Consumes `core`, `dom`. |
| `packages/theme-tailwind` (`@gridkitjs/theme-tailwind`) | The grid's stylesheet — palette tokens, dark mode, grid styles. Published.                            |
| `packages/export-xlsx` (`@gridkitjs/export-xlsx`)       | Excel export writer, registered through `exportWriters`. Plain TypeScript, no DOM. Published.         |
| `packages/theme-default`                                | Plain CSS for consumers not using Tailwind. Currently an empty stub. Private, unpublished.            |
| `apps/playground`                                       | Vite app used to develop against. Private, never published.                                           |

The split is the point: logic lives in `core` so it is testable without a DOM
and reusable from a future Vue/Svelte adapter, and the browser behaviours a
renderer attaches — pointer gestures, focus movement, observers, the
virtualizer's measuring — live in `dom` so that adapter reuses them too. If a
feature can be written without the DOM, it belongs in `core`; if it needs the
DOM but not React, in `dom`; `react` only draws. The boundary is enforced, not
just agreed: `core` compiles without the DOM `lib` and ESLint rejects any
`react`, `react-dom`, `@gridkitjs/react` or `@gridkitjs/dom` import from it,
and any `react`, `react-dom` or `@gridkitjs/react` import from `dom`.
`export-xlsx` is held to `core`'s rule, so the writer runs in Node too.

## Development

```bash
pnpm install
pnpm dev          # playground on http://localhost:5173
```

Packages resolve to **source** locally — `exports` points at `src/index.ts` and
is swapped to `dist` at publish time via `publishConfig`. Editing a package file
hot-reloads the playground immediately; never build to see a change.

To add a component: write it in `packages/react/src/`, export it from
`packages/react/src/index.ts`, use it in the playground.

Styling lives in `theme-tailwind`, not in the components. `packages/react`
renders semantic class names — `gridkit-data-grid`, `header-cell`, `grid-row` —
and the theme's stylesheet targets them. Keep it that way: a Tailwind utility
written in a component would oblige every consumer to scan our source for it,
which is what `@source` used to paper over.

## Docs

Each published package keeps its own docs as `.mdx` under
`packages/<pkg>/docs/`, with page order controlled by that folder's
`_meta.json`. Nested topics live in subfolders with their own `_meta.json` —
e.g. `packages/react/docs/columns/`. They are fetched and rendered by the
`gridkit-website` repo — there is no docs build here, so `.mdx` changes can
only be previewed there.

Keeping these current is a priority, not a follow-up task. A new public API,
component, or prop needs a doc page — or a new section on an existing one —
in the same change that adds it; a change in behaviour needs the existing
page updated to match. Treat this with the same weight as the changeset
requirement below: a PR that changes public behaviour without updating docs
has not finished, the same way one without a changeset hasn't. The two rules
are complementary — code changes need a changeset, user-facing changes need
docs, and a PR can need either, both, or neither depending on what changed.

Reference actual key presses with `<Kbd>` — `<Kbd>Ctrl</Kbd>+<Kbd>A</Kbd>`,
not backtick text like `` `Ctrl+A` ``. `<Kbd>` is globally available in
rendered docs (registered in `gridkit-website`'s MDX component map), so it
needs no import. Reserve it for keys, not mouse actions worded with "click"
or "drag".

## Tests

Two layers, at two different points in the stack.

**Vitest** covers logic — reducers, selection/sizing/ordering transforms,
anything that runs without a DOM. Test files sit next to the code as
`*.test.ts` in `src/`.

```bash
pnpm test                            # all packages
pnpm --filter @gridkitjs/core test     # one package
```

`react` still passes `--passWithNoTests`; drop that flag once it has real
Vitest tests of its own. `dom` passes it too, for good: its behaviours need
real layout and are tested through Playwright below, and Vitest there covers
only pure helpers such as overlay placement. Prefer testing logic in `core`,
where no DOM is required.

**Playwright component tests** cover `react`'s `DataGrid` and the `dom`
behaviours it attaches — pointer drags, keyboard navigation, real layout and
`ResizeObserver`, all of which need an actual browser rather than jsdom. They
live in `apps/playground/tests-ct/`, mounting `DataGrid` in isolation through
`@playwright/experimental-ct-react` rather than through the playground's own
demo (`App.tsx`), against the real `theme-tailwind` stylesheet so measured
widths and paddings are real ones. Chromium only — this is an internal
suite, not a cross-browser guarantee for a published package.

```bash
pnpm --filter playground test:e2e             # run the suite
pnpm --filter playground test:e2e:ui           # same, with Playwright's UI
pnpm --filter playground test:e2e:coverage     # instrumented; enforces 80% line/statement/function coverage over DataGrid/ and dom
```

`test:e2e` is not part of `pnpm test` and does not run under `pnpm -r test`,
by design — it's a separate, slower check, invoked explicitly rather than on
every `pnpm test` (CI runs it as its own job, see Standards). A new
`DataGrid` or `dom` behavior needs a Playwright test the same way new `core` logic
needs a Vitest one; `apps/playground/tests-ct/` holds one spec file per area
— `rendering`, `column-resize`, `keyboard-navigation`, `selection`,
`row-virtualization` and so on — so add to whichever one already covers the
area being changed.

## Standards

CI runs two jobs on every push and pull request. The `ci` job runs exactly
this, in order:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The `e2e` job runs the Playwright suite instrumented,
`pnpm --filter playground test:e2e:coverage`, and fails if line, statement or
function coverage over `packages/react/src/DataGrid/` and `packages/dom/src/`
drops below 80%.

- **TypeScript** — every tsconfig extends `tsconfig.base.json`: `strict`, plus
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Do not loosen
  these per package.
- **ESLint** — flat config, `strictTypeChecked`. Fix the code rather than adding
  disable comments.
- **Prettier** — double quotes, semicolons, 2-space indent, trailing commas, 80
  columns. Enforced in CI.
- **Line endings** — LF everywhere, pinned by `.gitattributes`.
- **ESM only.** No CommonJS output.
- **Versioning** — Changesets. See below; a change that reaches a published
  package needs one in the same commit.

### Versioning

Every change that reaches a **published** package — `core`, `dom`, `react`,
`theme-tailwind`, `export-xlsx` — needs a changeset, in the same commit as the
change:

```bash
pnpm changeset
```

Nothing else bumps a version. Do not hand-edit a `version` field, and do not
infer the bump from the commit type: `feat:` does not mean minor, and a `fix:`
that changes a signature is still breaking. The commit type and the release
version are independent.

**Each package carries its own version.** They are not kept in step, so a
release that takes `core` and `react` to `0.1.0` while `theme-tailwind` stays
at `0.0.1` is correct — a package with no pending changeset does not move.

**Which bump.** Pre-1.0, so `major` stays unused and breaking changes go in
`minor`:

| Bump    | When                                                                        |
| ------- | --------------------------------------------------------------------------- |
| `patch` | Behaviour unchanged for a correct caller — a bug fix, an internal refactor. |
| `minor` | New API, changed behaviour, or anything breaking. Say so in the summary.    |
| `major` | Not until 1.0.                                                              |

**What does not need one:** the playground, `theme-default` while it is
private, and anything that leaves shipped output untouched — tests, CI, README
and doc edits, tooling config. When in doubt, ask whether an installed consumer
could tell. If not, skip it.

**Writing the summary.** It becomes the changelog entry, read by someone
deciding whether to upgrade — so it is for consumers, not reviewers. Lead with
what changed for a caller. If a call site has to change, show the before and
after:

```md
---
"@gridkitjs/core": minor
---

`resolveColumnWidths` takes a `ColumnResolveOptions` object as its third
argument in place of the size defaults — `{ sizes: { width: 60 } }` where it
was `{ width: 60 }`.
```

**Which packages to list.** Only those whose own published code changed.
Dependents are bumped automatically — `updateInternalDependencies: "patch"` in
`.changeset/config.json` gives `react` a patch when `core` releases, so listing
`react` for a change made in `core` double-counts it. List `react` only when a
file under `packages/react` changed too.

A release consumes every pending changeset at once, so several small ones
across a branch are normal and preferable to one vague entry. They do not
stack: the highest bump a package is given wins and applies once, so four
pending minors move it from `0.0.1` to `0.1.0`, not to `0.4.0`. Every summary
still lands in the changelog as its own entry under that one version.

### Releasing

Both modes need a clean tree and `npm login` already done.

**A stable release is two steps, not one.** `pnpm release` only publishes what
is already in the `version` fields — it bumps nothing. The bump is
`pnpm version-packages`, and skipping it means `changeset publish` finds the
current version already on npm and exits having done nothing.

`version-packages` rewrites `version` fields, appends to each `CHANGELOG.md`,
and deletes the changeset files it consumed. Review that diff before committing
it — all of it belongs in the commit. The full sequence, including how the bump
reaches a protected `main`, is under **Branches and pull requests** below.

```bash
pnpm release:dev   # snapshot: 0.0.0-dev-<timestamp>, published under the `dev` tag
```

`release:dev` is the one to reach for while iterating, and unlike the stable
path it is a single command — it runs the version step itself. It cuts a
throwaway version off the `latest` tag, so `pnpm add @gridkitjs/core` keeps
resolving to the last stable release and only `@dev` sees the snapshot.

It rewrites versions and consumes changeset files as a side effect, so **do not
commit the tree it leaves behind** — `git checkout .` after publishing. The
changesets have to survive to drive the next stable release.

### Branches and pull requests

`main` is protected: it takes no direct pushes, and CI must pass before a merge.
Every change reaches it through a pull request, including your own.

```bash
git checkout main && git pull
git checkout -b feat/sortable-columns
# work, commit, and write the changeset
git push -u origin feat/sortable-columns
gh pr create --fill
```

Branch names take the commit type as their prefix — `feat/`, `fix/`,
`docs/`, `refactor/`, `chore/` — then a short kebab-case subject:
`feat/sortable-columns`, `fix/empty-row-array`.

**The changeset belongs in the PR**, in the same commit as the change that
needs it. A PR touching a published package without one has not finished:
nothing else will bump the version, so the change ships invisibly or not at
all.

**Doc updates belong in the same PR**, for the same reason: a behaviour
change and its doc page shouldn't ship in separate PRs, or they drift apart.

CI runs the sequence under **Standards** on every PR, in that order. Run it
locally first rather than using CI to find what a single command would have.

Squash-merge, so `main` keeps one commit per PR and the branch's messy history
stays on the branch. The squash subject is the PR title, so it follows the same
Conventional Commits rules as any other commit.

**Releases go out from `main`, never from a feature branch.** Merge the work
first, then cut the release. The version bump is itself a commit to a protected
branch, so it takes the same route as anything else:

```bash
git checkout main && git pull
git checkout -b chore/version-packages
pnpm version-packages
git commit -am "chore: version packages"
git push -u origin chore/version-packages
gh pr create --fill          # merge once CI is green
git checkout main && git pull
pnpm release                 # publish the versions now on main
```

`pnpm release` is the only step that runs off `main` directly, and it publishes
rather than committing — so it never pushes anything.

### Commits

[Conventional Commits](https://www.conventionalcommits.org):
`type(optional-scope): subject`.

**The subject is one short sentence.** Imperative mood, lowercase, no trailing
period, ideally under 72 characters. If it needs an "and", it is probably two
commits.

```
feat(react): add sortable column headers
fix(core): handle an empty row array
docs: document the theme's palette tokens
chore(deps): bump vite to 8.2
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`,
`chore`, `revert`.

Scope is the package without its namespace — `core`, `dom`, `react`,
`theme-tailwind`, `export-xlsx`, `theme-default`, `playground` — and is omitted
for repo-wide changes.

Breaking changes take a `!` before the colon (`feat(core)!: ...`) plus a
`BREAKING CHANGE:` footer.

**Default to no body.** Add one only when there's a genuinely non-obvious
_why_ — a bug workaround, a rejected alternative, a constraint from outside
the diff. Restating what the diff does in prose, even as a justification
("so that X can now do Y"), is still restating the diff — skip it if the
subject line and the code already make it clear.

The commit type does not drive release versions; Changesets does. The two are
independent.
