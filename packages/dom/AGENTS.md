# @gridkitjs/dom

Framework-free browser behaviours a GridKit renderer attaches to its own
markup: pointer gestures, focus, observers, the row virtualizer, overlays,
menus, downloads, clipboard, printing and live announcements. Plain
TypeScript with the DOM, published. Read the root
[Structure](../../AGENTS.md#structure) section for how it fits with `core`
and `react`.

## What must not go in it

ESLint rejects any `react`, `react-dom` or `@gridkitjs/react` import from
`dom` (the `packages/dom/**` block of `eslint.config.mjs`). Each behaviour
owns its listeners and observers and reports through callbacks, so it names
no framework's types. Logic that does not need the DOM belongs in `core`.

## Public API

`src/index.ts` is the package's only entry point. A new export goes there,
and into the docs as described under [Docs](#docs).

## Commands

```bash
pnpm --filter @gridkitjs/dom test        # Vitest, pure helpers only
pnpm --filter @gridkitjs/dom typecheck
pnpm --filter @gridkitjs/dom lint
pnpm --filter @gridkitjs/dom build       # tsup, only for publishing
```

## Tests

`dom` still passes `--passWithNoTests`, for good: its behaviours need real
layout and are tested through Playwright, and Vitest there covers only pure
helpers such as overlay placement.

The Playwright suite lives in `apps/playground/tests-ct/`; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md). A new behaviour
needs a test there, and `packages/dom/src/` counts toward its coverage
threshold.

## Docs

`packages/dom/docs/` is split by kind of behaviour, and its overview's
"Exports by page" table names every export of `@gridkitjs/dom` with the
page that documents it. A new export goes into that table and into its
page's `## Types` table or a section of its own, so nothing the package
exports goes unnamed.

The writing rules are in the root [Docs](../../AGENTS.md#docs) section.

## Releasing

Published, so a change here needs a changeset: see the root
[Versioning](../../AGENTS.md#versioning) section.
