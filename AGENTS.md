# GridKit

Headless data-grid toolkit. pnpm monorepo, ESM-only, TypeScript 6.

## Structure

Each folder links to its own `AGENTS.md`: what belongs in it, its commands and
its tests.

| Folder                                                                                       | What belongs in it                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`packages/core`](packages/core/AGENTS.md) (`@gridkitjs/core`)                               | Framework-agnostic grid logic — sorting, filtering, pagination. Plain TypeScript. **No React, no CSS.** |
| [`packages/dom`](packages/dom/AGENTS.md) (`@gridkitjs/dom`)                                  | Browser behaviours — gestures, focus, observers, overlays. Plain TypeScript with the DOM. No React.     |
| [`packages/react`](packages/react/AGENTS.md) (`@gridkitjs/react`)                            | React components. Renders semantic class names; carries no styles of its own. Consumes `core`, `dom`.   |
| [`packages/theme-tailwind`](packages/theme-tailwind/AGENTS.md) (`@gridkitjs/theme-tailwind`) | The grid's stylesheet — palette tokens, dark mode, grid styles. Published.                              |
| [`packages/export-xlsx`](packages/export-xlsx/AGENTS.md) (`@gridkitjs/export-xlsx`)          | Excel export writer, registered through `exportWriters`. Plain TypeScript, no DOM. Published.           |
| [`packages/theme-default`](packages/theme-default/AGENTS.md)                                 | Plain CSS for consumers not using Tailwind. Currently an empty stub. Private, unpublished.              |
| [`apps/playground`](apps/playground/AGENTS.md)                                               | Vite app used to develop against, and the Playwright component tests. Private, never published.         |
| [`examples`](examples/AGENTS.md)                                                             | Standalone StackBlitz apps on the published packages. Not in the workspace.                             |
| [`scripts`](scripts/AGENTS.md)                                                               | Node scripts for the docs pipeline: the docs manifest and the MDX tag check.                            |

The split is the point: logic lives in `core` so it is testable without a DOM
and reusable from a future Vue/Svelte adapter, and the browser behaviours a
renderer attaches — pointer gestures, focus movement, observers, the
virtualizer's measuring — live in `dom` so that adapter reuses them too. If a
feature can be written without the DOM, it belongs in `core`; if it needs the
DOM but not React, in `dom`; `react` only draws. The boundary is enforced, not
just agreed, by each package's `tsconfig.json` and by ESLint: each package's
own `AGENTS.md` states its rule.

## Development

```bash
pnpm install
pnpm dev          # playground on http://localhost:5173
```

Packages resolve to **source** locally — `exports` points at `src/index.ts` and
is swapped to `dist` at publish time via `publishConfig`. Editing a package file
hot-reloads the playground immediately; never build to see a change.

## Standards

CI runs two jobs on pushes and pull requests to `main`. The `ci` job runs
exactly this, in order; run it locally first rather than using CI to find what
a single command would have:

```bash
pnpm format:check && pnpm lint && node scripts/check-mdx-tags.mjs && pnpm typecheck && pnpm test && pnpm build
```

The `e2e` job runs `pnpm --filter playground test:e2e:coverage`, failing below
the threshold in [.claude/rules/testing.md](.claude/rules/testing.md#coverage).

- **TypeScript** — every tsconfig extends `tsconfig.base.json`: `strict`, plus
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Do not loosen
  these per package.
- **ESLint** — flat config, `strictTypeChecked`. Fix the code rather than adding
  disable comments.
- **Prettier** — double quotes, semicolons, 2-space indent, trailing commas, 80
  columns. Enforced in CI.
- **Line endings** — LF everywhere, pinned by `.gitattributes`.
- **ESM only.** No CommonJS output.
- **Versioning** — Changesets: see
  [.claude/rules/versioning.md](.claude/rules/versioning.md).

## Branches and pull requests

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

Squash-merge, so `main` keeps one commit per PR and the branch's messy history
stays on the branch. The squash subject is the PR title, so it follows the same
Conventional Commits rules as any other commit.

## Commits

[Conventional Commits](https://www.conventionalcommits.org):
`type(optional-scope): subject`, as in `feat(react): add sortable column headers`
or `docs: document the theme's palette tokens`.

**The subject is one short sentence.** Imperative mood, lowercase, no trailing
period, ideally under 72 characters. If it needs an "and", it is probably two
commits.

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`,
`chore`, `revert`.

Scope is the package without its namespace — `core`, `dom`, `react`,
`theme-tailwind`, `export-xlsx`, `theme-default`, `playground` — or
`examples`, and is omitted for repo-wide changes.

Breaking changes take a `!` before the colon (`feat(core)!: ...`) plus a
`BREAKING CHANGE:` footer.

**Default to no body.** Add one only when there's a genuinely non-obvious
_why_ — a bug workaround, a rejected alternative, a constraint from outside
the diff. Restating what the diff does in prose, even as a justification
("so that X can now do Y"), is still restating the diff — skip it if the
subject line and the code already make it clear.

## Where the rest lives

Topics that cut across folders. Claude Code loads each rule by path; with
another tool, open the one the work touches.

| File                                                       | What it covers                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| [.claude/rules/docs.md](.claude/rules/docs.md)             | Writing docs: the manifest pipeline, page template, samples, tags |
| [.claude/rules/testing.md](.claude/rules/testing.md)       | The two test layers, where each test goes, coverage               |
| [.claude/rules/versioning.md](.claude/rules/versioning.md) | Changesets, which bump, writing the summary, releasing            |
