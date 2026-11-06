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

Both modes need a clean tree and `npm login` already done.

**A stable release is two steps, not one.** `pnpm release` only publishes what
is already in the `version` fields — it bumps nothing. The bump is
`pnpm version-packages`, and skipping it means `changeset publish` finds the
current version already on npm and exits having done nothing.

`version-packages` rewrites `version` fields, appends to each `CHANGELOG.md`,
and deletes the changeset files it consumed. Review that diff before committing
it — all of it belongs in the commit.

**Releases go out from `main`, never from a feature branch.** Merge the work
first, then cut the release. The version bump is itself a commit to a protected
branch, so it takes the same route as anything else (see
[Branches and pull requests](../../AGENTS.md#branches-and-pull-requests) in
the root `AGENTS.md`):

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

### Snapshot releases

```bash
pnpm release:dev   # snapshot: 0.0.0-dev-<timestamp>, published under the `dev` tag
```

`release:dev` is the one to reach for while iterating, and unlike the stable
path it is a single command — it runs the version step itself. It cuts a
throwaway version off the `latest` tag, so `pnpm add @gridkitjs/core` keeps
resolving to the last stable release and only `@dev` sees the snapshot.

The version step rewrites versions and changelogs and consumes changeset
files, and the script undoes most of that itself once publishing ends, even
when it fails: it restores every `package.json` and `.changeset/` from git
and deletes any `CHANGELOG.md` it created, so the changesets survive to drive
the next stable release. Entries it appended to a `CHANGELOG.md` that was
already committed are left behind: discard them with `git checkout -- "*/*/CHANGELOG.md"`
rather than committing them.
