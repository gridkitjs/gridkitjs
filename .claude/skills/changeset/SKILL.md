---
name: changeset
description: Write a changeset for a change to a published GridKit package (core, dom, react, theme-tailwind, export-xlsx). Use when a change touches packages/*/src or a published package's shipped output, before committing it, or when asked to add or fix a changeset.
---

# Write a changeset

A changeset is the only thing that bumps a published package's version, and
its summary becomes the changelog entry. The policy (which packages are
published, the bump table, what needs none) is in
[.claude/rules/versioning.md](../../rules/versioning.md#versioning); this is
the procedure.

## 1. Decide whether one is needed

Ask whether an installed consumer could tell the difference. If not (tests,
CI, docs, README, tooling config, the playground, `theme-default`), stop:
no changeset.

## 2. Pick the packages

List only the packages whose own published code changed, by checking which
`packages/<pkg>/` folders the diff touches:

```bash
git diff --name-only main...HEAD -- packages
```

Don't add a dependent: `react` gets a patch automatically when `core`
releases. List `react` only when a file under `packages/react` changed too.

## 3. Pick the bump

Use the table in [versioning.md](../../rules/versioning.md#versioning):
`patch` when a correct caller sees no change, `minor` for new API, changed
behaviour or anything breaking. Never `major` before 1.0. The commit type
doesn't decide it: a `fix:` that changes a signature is `minor`.

## 4. Write the file

Create it by hand under `.changeset/`, named after the change in kebab case
(`.changeset/column-resolve-options.md`), not a random slug. One change per
file; several small changesets on a branch are better than one vague one.

```md
---
"@gridkitjs/core": minor
---

`resolveColumnWidths` takes a `ColumnResolveOptions` object as its third
argument in place of the size defaults: `{ sizes: { width: 60 } }` where it
was `{ width: 60 }`.
```

The summary is for someone deciding whether to upgrade:

- Lead with what changed for a caller, not how it was implemented.
- If a call site has to change, show the before and the after.
- If it's breaking, say so.
- Name the public API in backticks: props, functions, types, CSS classes.

## 5. Check it

```bash
pnpm changeset status
```

It lists each package with the bump it will get. Confirm every package from
step 2 appears with the bump from step 3, and no other. It exits with an
error when a package changed on the branch and no changeset exists; any file
under `packages/<pkg>/` counts, so that error alone doesn't mean one is
needed (step 1 decides). Commit the changeset in the same commit as the
change it describes.
