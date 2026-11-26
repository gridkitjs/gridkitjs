# @gridkitjs/forms-dom

Framework-free browser behaviours a GridKit forms renderer attaches to its
own controls: the text-input pipeline, toggles, auto-grow, Enter navigation,
focus helpers, and later the overlays, list keyboard, virtualizer and
announcer the grid shares. Plain TypeScript with the DOM. Private until its
first release: `"private": true` keeps it out of the release, pack and docs
tooling. Read the root [Structure](../../AGENTS.md#structure) section for how
it fits with `forms-core` and `forms`.

## What must not go in it

The `packages/forms-dom/**` block of `eslint.config.mjs` rejects `react`,
`react-dom`, `@gridkitjs/forms` and every grid package (`@gridkitjs/core`,
`@gridkitjs/dom`, `@gridkitjs/react`, `@gridkitjs/export-xlsx`). Its one
dependency is `@gridkitjs/forms-core`. Each behaviour owns its listeners and
reports through callbacks or a forms-core controller, so it names no
framework's types. Logic that does not need the DOM belongs in `forms-core`.

## Public API

`src/index.ts` is the package's only entry point. A new export goes there,
and into the docs as described under [Docs](#docs).

## State and teardown

| Machine             | File                          | States                                                   | Tests                                                 |
| ------------------- | ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| `TextPipelineState` | `src/text/attachTextInput.ts` | `ready`, `editing`, `composing`, `rewriting`, `detached` | `forms-events.spec.tsx`, `forms-field-input.spec.tsx` |

The specs are in `apps/playground/tests-ct/`. The convention is in the root
[State](../../AGENTS.md#state) section. Every behaviour releases what it
holds on every exit, through the `detach` or `destroy` it returns.

`attachTextInput` holds what the browser is in the middle of (an edit
`onBeforeInput` allowed, a composition, an insert of its own); the field's
own lifecycle is the forms-core controller's. Its listeners share one
`AbortController`, so `detach` removes them all at once.

`attachEnterNavigation` (`src/form/formControls.ts`) holds one `keydown`
listener on the form and no state; its `detach` removes it.

`attachAutoGrow` (`src/text/attachAutoGrow.ts`) holds one `input` listener
and a `ResizeObserver` on the textarea, and no state beyond the last width
it measured; its `detach` removes both. `forms-text-input.spec.tsx` covers
it.

## Commands

```bash
pnpm --filter @gridkitjs/forms-dom test        # Vitest, pure helpers only
pnpm --filter @gridkitjs/forms-dom typecheck
pnpm --filter @gridkitjs/forms-dom lint
pnpm --filter @gridkitjs/forms-dom build       # tsup, only for publishing
```

## Tests

forms-dom passes `--passWithNoTests`, as `dom` does: its behaviours need real
layout and events and are tested through Playwright, and Vitest covers only
pure helpers.

The Playwright suite lives in `apps/playground/tests-ct/`; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md). A new behaviour
needs a test there, and `packages/forms-dom/src/` counts toward its coverage
threshold.

## Docs

`packages/forms-dom/docs/`. Its overview's "Exports" table names every
export of `@gridkitjs/forms-dom` with the page that documents it. The
website does not show the forms packages yet. The writing rules are in
[.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Private until its first release, so it takes no changeset yet: nothing
releases it.
