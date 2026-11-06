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

Each package and app has its own `AGENTS.md` next to its `package.json`, with
what belongs in it, its commands and its tests: for example, how to add a
component and where styling goes are in `packages/react/AGENTS.md`.

## Standards

CI runs two jobs on every push and pull request. The `ci` job runs exactly
this, in order:

```bash
pnpm format:check && pnpm lint && node scripts/check-mdx-tags.mjs && pnpm typecheck && pnpm test && pnpm build
```

The `e2e` job runs the Playwright suite instrumented,
`pnpm --filter playground test:e2e:coverage`, and fails below the coverage
threshold in [.claude/rules/testing.md](.claude/rules/testing.md#coverage).

- **TypeScript** — every tsconfig extends `tsconfig.base.json`: `strict`, plus
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Do not loosen
  these per package.
- **ESLint** — flat config, `strictTypeChecked`. Fix the code rather than adding
  disable comments.
- **Prettier** — double quotes, semicolons, 2-space indent, trailing commas, 80
  columns. Enforced in CI.
- **Line endings** — LF everywhere, pinned by `.gitattributes`.
- **ESM only.** No CommonJS output.
- **Versioning** — Changesets. See
  [.claude/rules/versioning.md](.claude/rules/versioning.md); a change that
  reaches a published package needs one in the same commit.

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
