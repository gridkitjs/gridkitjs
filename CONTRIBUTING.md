# Contributing to GridKit

This page is the short version. [AGENTS.md](AGENTS.md) and the files it links
hold the details, for people and coding agents alike.

## Setup

You need Node 22 or newer and pnpm 10. Install and start the playground with
the commands under [Development](AGENTS.md#development); packages resolve to
source, so an edit shows up without a build.

## Workflow

`main` is protected, so every change goes through a pull request. Branch
naming, merging and commit messages are under
[Branches and pull requests](AGENTS.md#branches-and-pull-requests) and
[Commits](AGENTS.md#commits).

```bash
git checkout main && git pull
git checkout -b feat/sortable-columns
# work, commit, and write the changeset
git push -u origin feat/sortable-columns
gh pr create --fill
```

## Before you open a pull request

- [ ] **Changeset.** A change to a published package has one, from
      `pnpm changeset`, in the same commit. See
      [versioning](.claude/rules/versioning.md).
- [ ] **Docs.** A new public API, component or prop has a doc page or
      section, and changed behaviour has its page updated. See
      [docs](.claude/rules/docs.md).
- [ ] **Tests.** New `core` logic has a Vitest test; a new `DataGrid` or `dom`
      behaviour has a Playwright test. See [testing](.claude/rules/testing.md).
- [ ] **CI.** The sequence under [Standards](AGENTS.md#standards) passes
      locally.
- [ ] **Comments.** They describe the code as it is now, not the change. See
      [Comments](AGENTS.md#comments).
- [ ] **Commits and PR title.** Conventional Commits, as under
      [Commits](AGENTS.md#commits).
