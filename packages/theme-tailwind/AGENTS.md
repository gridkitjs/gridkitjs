# @gridkitjs/theme-tailwind

The grid's stylesheet for Tailwind v4: palette tokens, dark mode and grid
styles. Published. `tailwindcss` is a peer dependency.

## Layout

The whole package is `src/styles.css`, exported as
`@gridkitjs/theme-tailwind/styles.css`. It ships as source: there is no build
step, and no `test`, `typecheck` or `lint` script.

How the palette tokens and dark mode work (the `-light` and `-dark` pairs,
the app's own `dark:` variant, the `.gridkit-light` and `.gridkit-dark`
overrides) is explained in the comment at the top of `src/styles.css`. Keep
that comment current when the mechanism changes.

## What belongs here

Every style the grid has. The stylesheet targets the semantic class names
`@gridkitjs/react` renders; components carry no styles of their own (see
[packages/react/AGENTS.md](../react/AGENTS.md#styling)).

## Tests

No tests of its own. The Playwright suite mounts `DataGrid` against this
stylesheet, so measured widths and paddings come from it; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md), including the
stale-cache gotcha after editing `styles.css`.

## Docs

`packages/theme-tailwind/docs/`. The writing rules are in the root
[Docs](../../AGENTS.md#docs) section.

## Releasing

Published, so a change here needs a changeset: see the root
[Versioning](../../AGENTS.md#versioning) section.
