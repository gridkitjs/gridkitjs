# examples

Standalone Vite and React apps, one per folder, that run GridKit from the
**published** packages on npm, the way a consumer would. Each one opens on
StackBlitz through a `<StackblitzExample path="...">` box in the docs (see
[.claude/rules/docs.md](../.claude/rules/docs.md#live-examples) for when to use one).

## How they differ from the workspace

- They are not in the pnpm workspace (`pnpm-workspace.yaml` lists only
  `packages/*` and `apps/*`), so `pnpm install`, `pnpm lint`, `pnpm typecheck`
  and `pnpm test` at the root do not touch them. Only `pnpm format:check`
  does.
- Each uses npm and commits its own `package-lock.json`.
- Their `@gridkitjs/*` dependencies are version ranges on npm, never
  `workspace:*`, so a change in `packages/` does not reach them until it is
  released.

## Working on one

```bash
cd examples/column-sorting
npm install
npm run dev
```

`npm run build` type-checks the app and builds it, the nearest thing these
projects have to CI.

## After a release

The release workflow bumps them: after a stable release, the release bot
opens a `chore(examples): bump to the latest releases` PR from
`chore/bump-examples`, with each example's `@gridkitjs/*` ranges moved to
`^<released version>` and its `package-lock.json` refreshed. Review and
merge it like any other PR. Examples are not published, so it needs no
changeset.

The workflow runs `node scripts/bump-examples.mjs`; run it by hand, from the
repo root, to do the same locally (`--dry-run` prints the diff only).
