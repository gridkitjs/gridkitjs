# @gridkitjs/forms

React form inputs and form structure. Renders semantic `gridkit-forms-*`
class names and carries no styles of its own: the forms stylesheet in
`theme-tailwind` and `theme-css` styles it. Consumes `forms-core` and
`forms-dom`. Private until its first release: `"private": true` keeps it out
of the release, pack and docs tooling. Read the root
[Structure](../../AGENTS.md#structure) section for how it fits with
`forms-core` and `forms-dom`.

## What must not go in it

`forms` only draws. Logic that runs without a DOM belongs in `forms-core`,
and a browser behaviour that needs no React in `forms-dom`, so a second
renderer reuses both. The `packages/forms/**` block of `eslint.config.mjs`
rejects every grid package (`@gridkitjs/core`, `@gridkitjs/dom`,
`@gridkitjs/react`, `@gridkitjs/export-xlsx`), and the React hooks rules
apply.

Every class it renders starts with `gridkit-forms-`, and a state is an
`is-*` class beside one; the theme's class-names test holds the docs to
them.

## Public API

`src/index.ts` is the package's only entry point. A new export goes there,
and into the docs as described under [Docs](#docs). The types an app writes
against (messages, events) are re-exported from `forms-core`, so an app
imports from `@gridkitjs/forms` alone.

The bundle is marked `"sideEffects": false` so that a bundler drops every
component an app does not import. Keep it true: no module-level calls a
bundler must assume have effects, such as `memo(...)` or `forwardRef(...)`
at the top level.

## State and teardown

| Machine | File | States | Tests |
| ------- | ---- | ------ | ----- |

The specs are in `apps/playground/tests-ct/`. The convention is in the root
[State](../../AGENTS.md#state) section.

Every input is built on `useFieldInput` (`src/useFieldInput.tsx`), which
holds no lifecycle of its own: the field's is the forms-core controller's,
and what the browser is in the middle of is forms-dom's. The hook creates
the controller once, hands it the latest props during render
(`setOptions` is silent), passes a controlled `value` to `sync` in a
layout effect after every render, attaches forms-dom to the control in a
layout effect keyed on the element and calls `destroy` on unmount. The
control's text is forms-dom's alone, so React renders it as `defaultValue`
and never as a controlled `value`. StrictMode's second mount attaches again
and leaves the controller usable. `forms-events.spec.tsx` and
`forms-field-input.spec.tsx` cover it through the harness in
`tests-ct/support/forms/`.

## Commands

```bash
pnpm --filter @gridkitjs/forms test        # Vitest
pnpm --filter @gridkitjs/forms typecheck
pnpm --filter @gridkitjs/forms lint
pnpm --filter @gridkitjs/forms build       # tsup, only for publishing
```

## Tests

Vitest covers server rendering (`renderToString`) and hydration; everything
drawn is tested through Playwright in `apps/playground/tests-ct/`, see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md). A new component
needs a test there, and `packages/forms/src/` counts toward its coverage
threshold.

## Docs

`packages/forms/docs/`, one page per component. Its overview's "Exports"
table names every export of `@gridkitjs/forms` with the page that documents
it. The website does not show the forms packages yet. The writing rules are
in [.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Private until its first release, so it takes no changeset yet: nothing
releases it.
