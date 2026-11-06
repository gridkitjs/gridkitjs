---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "apps/playground/tests-ct/**"
---

# Tests

This rule applies to every test in the repo: the Vitest files next to the
code and the Playwright component tests in `apps/playground/tests-ct/`.

Two layers, at two different points in the stack.

## Vitest

**Vitest** covers logic — reducers, selection/sizing/ordering transforms,
anything that runs without a DOM. Test files sit next to the code as
`*.test.ts` in `src/`.

```bash
pnpm test                            # all packages
pnpm --filter @gridkitjs/core test     # one package
```

`react` and `dom` each have their own Vitest notes in their `AGENTS.md`.
Prefer testing logic in `core`, where no DOM is required.

## Playwright component tests

**Playwright component tests** cover `react`'s `DataGrid` and the `dom`
behaviours it attaches — pointer drags, keyboard navigation, real layout and
`ResizeObserver`, all of which need an actual browser rather than jsdom. They
live in `apps/playground/tests-ct/`;
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md) covers how they
run, their commands and where a new one goes. A new `DataGrid` or `dom`
behavior needs a Playwright test the same way new `core` logic needs a Vitest
one.

## Coverage

CI's `e2e` job (see [Standards](../../AGENTS.md#standards) in the root
`AGENTS.md`) fails if line, statement or function coverage over
`packages/react/src/DataGrid/` and `packages/dom/src/` drops below 80%.
