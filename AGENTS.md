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
| [`scripts`](scripts/AGENTS.md)                                                               | Node scripts for the docs pipeline and for verifying the packed packages, with their smoke apps.        |

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

CI runs three jobs on pushes and pull requests to `main`. The `ci` job runs
exactly this, in order; run it locally first rather than using CI to find what
a single command would have:

```bash
pnpm format:check && pnpm lint && node scripts/check-mdx-tags.mjs && pnpm typecheck && pnpm test && pnpm build
```

The `e2e` job runs `pnpm --filter playground test:e2e:coverage`, failing below
the threshold in [.claude/rules/testing.md](.claude/rules/testing.md#coverage).
The `packages` job packs the published packages, lints the tarballs and
installs them into fresh Vite, Next.js and Node apps; see
[scripts/AGENTS.md](scripts/AGENTS.md#package-verification).

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

### Comments

A comment describes the code as it is now, for a reader who never saw an
earlier version. The history of a change belongs in git, the PR and the
changeset, not in the file.

- Comment only what the code can't say: a reason that isn't obvious, a
  workaround and what it works around, a constraint from outside the file.
  Don't restate what the next line does.
- Never narrate the change: "was x, now y", "changed to fix #12",
  "instead of the old approach", "new:", "updated to". If a comment only
  makes sense next to the diff, it belongs in the PR or nowhere.
- Code you delete takes its comments with it. Leave no "removed X" note and
  no commented-out code.
- Code you change: fix or delete the comments it makes wrong.

The test: would this comment still read correctly to someone opening the
file cold, a year from now?

## Branches and pull requests

`main` is protected: it takes no direct pushes, and CI must pass before a merge.
Every change reaches it through a pull request, including your own; the
commands are in [CONTRIBUTING.md](CONTRIBUTING.md#workflow).

Branch names take the commit type as their prefix — `feat/`, `fix/`,
`docs/`, `refactor/`, `chore/` — then a short kebab-case subject:
`feat/sortable-columns`, `fix/empty-row-array`.

**The changeset belongs in the PR**, in the same commit as the change that
needs it. A PR touching a published package without one has not finished:
nothing else will bump the version, so the change ships invisibly or not at
all.

**Doc updates belong in the same PR**, for the same reason: a behaviour
change and its doc page shouldn't ship in separate PRs, or they drift apart.

A PR description describes the end state and why it's needed, not how the
branch got there (what was tried, what was reverted, "addressed review
feedback"). A changeset is the exception: it describes a change on purpose,
with its before and after.

Squash-merge, so `main` keeps one commit per PR and the branch's messy history
stays on the branch. The squash subject is the PR title, so it follows the same
Conventional Commits rules as any other commit.

**Releases are not made by hand.** The release workflow starts on a push to
`main`: it keeps the "Version Packages" PR current, publishes a `dev`
snapshot after a merge that changes a published package, and publishes a
stable release, once the maintainer approves it, after that PR merges. There
is no npm token and no release command to run; see
[Releasing](.claude/rules/versioning.md#releasing).

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
another tool, open the one the work touches. The skills are step-by-step
procedures that apply those rules; they read as checklists too.

| File                                                          | What it covers                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| [.claude/rules/docs.md](.claude/rules/docs.md)                | Writing docs: the manifest pipeline, page template, samples, tags |
| [.claude/rules/testing.md](.claude/rules/testing.md)          | The two test layers, where each test goes, coverage               |
| [.claude/rules/versioning.md](.claude/rules/versioning.md)    | Changesets, which bump, writing the summary, releasing            |
| [CONTRIBUTING.md](CONTRIBUTING.md)                            | Setup, the workflow and the PR checklist, on one screen           |
| [.claude/skills/changeset](.claude/skills/changeset/SKILL.md) | Skill: writing a changeset, for a change to a published package   |
| [.claude/skills/docs-page](.claude/skills/docs-page/SKILL.md) | Skill: writing or updating a docs page, for a public API change   |
| [.claude/skills/verify](.claude/skills/verify/SKILL.md)       | Skill: running the CI checks locally, before a push or PR         |
