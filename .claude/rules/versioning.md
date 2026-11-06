---
paths:
  - ".changeset/**"
  - "packages/*/package.json"
  - "packages/*/CHANGELOG.md"
---

# Versioning and releasing

This rule applies to changesets, package versions and changelogs: when a
change needs a changeset, how to write one, and how a release goes out.

## Versioning

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

## Releasing

Releases are made by GitHub Actions, never from a laptop. Nobody runs
`changeset publish` or `npm publish` by hand, there is no npm token, and
contributors never release: a contributor's part ends with the changeset and
the docs in the PR. The workflow is
[`.github/workflows/release.yml`](../../.github/workflows/release.yml); it
authenticates to npm through trusted publishing, and the scripts it calls are
listed in [scripts/AGENTS.md](../../scripts/AGENTS.md#release-scripts).

### What a merge to `main` does

Every push to `main` runs the workflow, which looks at the repository and does
one of three things:

- **Changesets are pending.** The release bot opens or updates the
  "chore: version packages" PR, which holds the `version` bumps and changelog
  entries that `pnpm version-packages` produces from the pending changesets.
  If the push also changed a published package's `src/`, the packages go out
  as a **snapshot**: version `0.0.0-dev-<timestamp>`, published under the
  `dev` dist-tag after the same pack, lint and smoke checks as CI, with no git
  tags. `pnpm add @gridkitjs/core` keeps resolving to the last stable release;
  only `@dev` sees a snapshot. The website is told, so
  [next.gridkitjs.com](https://next.gridkitjs.com) installs it.
- **No changesets are pending, and a version is not on npm or not tagged.**
  That is what merging the Version Packages PR leaves behind, and it starts a
  **stable release**.
- **Neither.** Nothing is published.

A merge that touches a package's `docs/`, `CHANGELOG.md` or `package.json`
also publishes preview docs, in a separate workflow; see
[docs.md](docs.md#the-docs-manifest).

### A stable release

1. Review the Version Packages PR: the versions, the changelogs, and that
   every changeset summary reads well for a consumer. Merge it like any other
   PR.
2. The workflow re-runs the CI checks, the e2e suite and the package
   verification on the merge commit.
3. The `publish` job then waits for approval on the `release` environment.
   The maintainer approves the pending deployment on the run's page on
   GitHub, or from the GitHub mobile app.
4. Once approved, it publishes the exact tarballs the checks verified, pushes
   the `@gridkitjs/<pkg>@<version>` tags, writes the GitHub Releases from the
   changelogs, publishes the production docs to `docs-meta`, and tells the
   website which versions and docs commit to ship. It also opens the bot's PR
   that bumps `examples/`.

### Docs-only release

Production docs change only with a release. To ship docs without a version
bump, run the Release workflow by hand on `main` from the Actions tab with
`mode` set to `docs-only`. It skips npm and still waits for the `release`
approval, then publishes the manifest of `main`'s head to `docs-meta` and
tells the website.

### Re-running a release

Every publishing step skips what is already done, so a release that stopped
part-way (a flaky job, a missed approval) is finished by re-running the failed
workflow run from its page on GitHub. Versions npm already has are not
published again, and existing tags and GitHub Releases are left alone. To
rehearse, run the workflow by hand with `dry-run` ticked: it does everything
but publish, tag, release and push (a stable or docs-only dry run also waits
for approval).
