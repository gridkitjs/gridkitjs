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

`TextInput` and `SearchInput` (`src/text/`) are the reference inputs: each
calls `useFieldInput` with its own `kind` and `FieldInputOptions`, and draws
the shared box (`ControlBox` in `src/text/parts.tsx`) around the control.
They hold no lifecycle: a password's reveal is one boolean, the counter's
announcement waits on a `scheduleTimeout` its effect cancels, and a
multiline input attaches forms-dom's `attachAutoGrow` in a layout effect
that detaches it. A later input copies this shape.
`forms-text-input.spec.tsx` and `forms-search-input.spec.tsx` cover them.

`NumberInput` and `PercentInput` (`src/number/`) share one internal
`NumberControl`, which calls `useFieldInput` with a number `kind` (forms-core's
number parser and formatter, an exact `equals`, `NumberDetails`, and
`filterNumberEdit` as its `filterInput`) and attaches forms-dom's
`attachStepKeys` to the control and `attachHoldRepeat` to each stepper
button, each in a layout effect that detaches it; a hold is cancelled when
the control loses focus. They hold no lifecycle of their own.
`forms-number-input.spec.tsx` covers them.

`NumberRangeInput` (`src/number/NumberRangeInput.tsx`) is the first input
made of parts. It calls `useCompositeInput` (`src/useCompositeInput.tsx`),
which does for forms-core's composite controller what `useFieldInput`
does for a field controller (the two share the settings, lifecycle,
messages and `Field` report helpers in `src/useFieldInput.tsx`) and
attaches forms-dom's `attachFocusGroup` to the root in a layout effect
that detaches it. Each end attaches the text pipeline to its part through
`usePartControl`, and forms-dom's step keys, each in a layout effect that
detaches it. The number kind both share with `NumberControl` is in
`src/number/numberKind.ts`. It holds no lifecycle of its own.
`forms-number-range-input.spec.tsx` covers it.

`MaskedInput` (`src/mask/`) calls `useFieldInput` with a mask `kind`
(forms-core's mask parser, formatter and `filterMaskEdit` as its
`filterInput`, `MaskDetails`) built in `src/mask/maskKind.ts`, which also
resolves a preset and checks the patterns, falling back to plain text on a
malformed one. forms-dom lays composed text into the mask at
`compositionend` and keeps a clicked caret before the first empty slot
(`lastCaret`). It holds no lifecycle of its own.
`forms-masked-input.spec.tsx` covers it.

`Checkbox` and `Switch` (`src/toggle/`) share one internal `ToggleInput`,
which calls `useFieldInput` with the `toggle` option: the hook then
attaches forms-dom's `attachToggle` in place of the text pipeline, turns
off `commitOnLeave` and tells the `Field` the control's label sits beside
it, so a floating label sits as `top`. They hold no lifecycle of their
own. `forms-checkbox.spec.tsx` and `forms-switch.spec.tsx` cover them.

`Field` (`src/field/`) holds no lifecycle either: it keeps what its input
last reported (shown messages, and whether the control is focused and
empty) and gives the input its ids and states through `FieldContext`. An
input reports from a layout effect and takes its report back in the
effect's cleanup, so nothing outlives the input. The settings every level
of a form shares (mode, density, label position, `readOnly`, `disabled`,
locale, messages) live in `src/settings.tsx`, one memoized context per
level, the outermost an optional `FormsProvider`. `forms-field.spec.tsx`
and `forms-provider.spec.tsx` cover it. A `FieldGroup` gives its inputs
the same context with no `controlId`, and lists every input's report,
keyed by the input's own `useId`.

`Form` (`src/form/`) holds no lifecycle: it makes one `FormContext` when
it mounts, holding forms-core's field registry, the collapsible sections
and the `MessageSummary` element. Fields register while they show
messages, inputs add their controller's `reveal` (an app's own input its
`useField` `onReveal`), and sections and the summary add themselves, each from a layout effect or ref whose cleanup
takes it back. Only `MessageSummary` subscribes to the registry, so a
field's change re-renders that field and the summary, never the form. A
refused submit renders the reveal at once (`flushSync`) so the summary
lists the messages before it takes focus, and `focusControl` opens the
sections around a control the same way before focusing it. A
`FormSection`'s expansion is one boolean, controlled or not, and Enter
navigation is forms-dom's `attachEnterNavigation`, attached in a layout
effect that detaches it. `forms-form.spec.tsx`, `forms-layout.spec.tsx` and
`forms-message-summary.spec.tsx` cover them.

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
