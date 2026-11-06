---
name: verify
description: Run GridKit's CI checks locally, in CI's order, before pushing or opening a pull request. Use when asked to verify, check or validate a change, or to run CI locally, and before any push or PR.
---

# Run the CI checks locally

CI runs two jobs, `ci` and `e2e`, defined in `.github/workflows/ci.yml`. Run
the same steps here first rather than using CI to find what one command would
have. What each check enforces is under
[Standards](../../../AGENTS.md#standards) in the root `AGENTS.md`.

## 1. The `ci` job

Run from the repo root, in this order. Each step stops the chain on failure:

```bash
pnpm format:check && pnpm lint && node scripts/check-mdx-tags.mjs && pnpm typecheck && pnpm test && pnpm build
```

CI starts with `pnpm install --frozen-lockfile`; if you changed a
`package.json`, run `pnpm install` first and commit the updated
`pnpm-lock.yaml`.

## 2. The `e2e` job, when it applies

Run it when the change touches `packages/react/src/` (the `DataGrid`),
`packages/dom/src/`, `packages/theme-tailwind/` or `apps/playground/tests-ct/`:

```bash
pnpm --filter playground test:e2e:coverage
```

This is what CI runs: the Playwright component tests, instrumented, failing
below the [coverage threshold](../../rules/testing.md#coverage). It clears
the Playwright build cache itself. On a fresh machine, install the browser
once with `pnpm --filter playground exec playwright install chromium`.

For a quicker run without coverage, use `pnpm --filter playground test:e2e`,
but delete `apps/playground/playwright/.cache` first after editing
`packages/theme-tailwind/src/styles.css`, or it tests the old styles (see
[apps/playground/AGENTS.md](../../../apps/playground/AGENTS.md#stale-styles-after-a-stylesheet-edit)).

## 3. Reading a failure

| Step              | Fix                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `format:check`    | Run `pnpm format`, then review the diff. Line endings must be LF.                                       |
| `lint`            | Fix the code; don't add a disable comment. The failing package's name prefixes each line.               |
| `check-mdx-tags`  | It names the file and line of an unregistered tag. See [scripts/AGENTS.md](../../../scripts/AGENTS.md). |
| `typecheck`       | Fix the types; don't loosen the tsconfig. A missing DOM type in `core` means it belongs in `dom`.       |
| `test`            | Rerun one package with `pnpm --filter @gridkitjs/<pkg> test`.                                           |
| `build`           | Rerun one package with `pnpm --filter @gridkitjs/<pkg> build` to see its full error.                    |
| `test:e2e`        | Rerun one area with `pnpm --filter playground test:e2e tests-ct/<area>.spec.tsx`.                       |
| coverage under 80 | Add a Playwright test for the uncovered code in the spec file for that area.                            |

`check-mdx-tags` skipping with a warning (the hosted tag list returned a 404)
is a pass, as in CI.

Report each step as passed or failed with its real output. Don't call a step
passed that you didn't run.
