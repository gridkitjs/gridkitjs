# @gridkitjs/core

Framework-agnostic grid logic: the grid's options and controller, column
definitions and sizing, sorting, filtering, row grouping, aggregates,
pagination, keyboard navigation, and the commands and menu model every menu
and toolbar is drawn from. Plain TypeScript, published. Read the root
[Structure](../../AGENTS.md#structure) section for how it fits with `dom` and
`react`.

## What must not go in it

`core` compiles without the DOM `lib` and ESLint rejects any `react`,
`react-dom`, `@gridkitjs/react` or `@gridkitjs/dom` import from it.

The two halves of that rule live in `tsconfig.json` (`lib` is `ES2025` only)
and in the `packages/core/**` block of `eslint.config.mjs`. Fix the code
rather than widening either.

## Public API

`src/index.ts` is the package's only entry point: anything not exported from
it is internal. A new public function or type is exported there, and needs a
doc page (see [Docs](#docs)).

## Commands

```bash
pnpm --filter @gridkitjs/core test        # Vitest
pnpm --filter @gridkitjs/core typecheck
pnpm --filter @gridkitjs/core lint
pnpm --filter @gridkitjs/core build       # tsup, only for publishing
```

## Tests

Vitest only. Test files sit next to the code as `*.test.ts`. Logic that can
be tested here, without a DOM, should be: see
[.claude/rules/testing.md](../../.claude/rules/testing.md).

## Docs

`packages/core/docs/`, page order in its `_meta.json`. The writing rules are
in [.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Published, so a change here needs a changeset: see
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
