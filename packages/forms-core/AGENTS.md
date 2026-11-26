# @gridkitjs/forms-core

Framework-free form-input logic: values and drafts, the field lifecycle and
its reducer, event objects and their order, the parse and format contract,
validators, messages and their catalogue. Plain TypeScript with no DOM.
Private until its first release: `"private": true` keeps it out of the
release, pack and docs tooling. Read the root
[Structure](../../AGENTS.md#structure) section for how it fits with
`forms-dom` and `forms`.

## What must not go in it

forms-core runs anywhere a field can be driven from, a Node test included,
so it has no DOM: its `tsconfig.json` `lib` is `["ES2025"]`. The
`packages/forms-core/**` block of `eslint.config.mjs` rejects `react`,
`react-dom`, every grid package (`@gridkitjs/core`, `@gridkitjs/dom`,
`@gridkitjs/react`, `@gridkitjs/export-xlsx`) and the other forms packages.
It has no dependencies. It keeps no timers either: whoever drives a field
hands it a `Schedule`. Anything that needs the DOM belongs in `forms-dom`.

## Public API

`src/index.ts` is the package's only entry point. A new export goes there,
and into the docs as described under [Docs](#docs).

## State and teardown

| Machine | File | States | Tests |
| ------- | ---- | ------ | ----- |

The convention is in the root [State](../../AGENTS.md#state) section: a
lifecycle is one union tagged `kind`, every transition in one reducer, tested
in Vitest.

## Commands

```bash
pnpm --filter @gridkitjs/forms-core test        # Vitest
pnpm --filter @gridkitjs/forms-core typecheck
pnpm --filter @gridkitjs/forms-core lint
pnpm --filter @gridkitjs/forms-core build       # tsup, only for publishing
```

## Tests

Vitest, next to the code as `*.test.ts`. Every transition of a reducer and
every event order has a test here, where no DOM is needed.

## Docs

`packages/forms-core/docs/`. Its overview's "Exports" table names every
export of `@gridkitjs/forms-core` with the page that documents it. The
website does not show the forms packages yet. The writing rules are in
[.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Private until its first release, so it takes no changeset yet: nothing
releases it.
