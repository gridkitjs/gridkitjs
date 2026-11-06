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

Bump every example to the new release in one change: update the
`@gridkitjs/*` ranges in each `package.json`, run `npm install` in each folder
to refresh its `package-lock.json`, and commit them together as
`chore(examples): update to the latest gridkit release`. Examples are not
published, so they need no changeset.
