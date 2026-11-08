# @gridkitjs/theme-tailwind

The grid's stylesheet for Tailwind v4: palette tokens, dark mode and grid
styles. Published. `tailwindcss` is a peer dependency.

## Layout

The package ships `src/` as source, with no build step.

| Path              | What it holds                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles.css`  | The stylesheet, exported as `@gridkitjs/theme-tailwind/styles.css`.                                                                                                                                                              |
| `src/tokens.json` | The token manifest, exported as `@gridkitjs/theme-tailwind/tokens.json`: every theme token's group, tier, type and default.                                                                                                      |
| `scripts/`        | Not shipped. The token test, and the helpers it reads the two files with: `css.mjs` parses a stylesheet, `manifest.mjs` the manifest. `token-docs.mjs` generates the docs' token tables, and `write-token-docs.mjs` writes them. |

There is no `typecheck` or `lint` script: `scripts/` is plain ESM `.mjs`
with JSDoc types, like the repo's own [scripts](../../scripts/AGENTS.md).

How the palette tokens and dark mode work (the `-light` and `-dark` pairs,
the app's own `dark:` variant, the `.gridkit-light` and `.gridkit-dark`
overrides) is explained in the comment at the top of `src/styles.css`. Keep
that comment current when the mechanism changes.

## Theme tokens

A theme token is a `--gridkit-*` custom property declared on `:root` in
`styles.css`, and every one is listed in `tokens.json`. The JSDoc typedefs in
`scripts/manifest.mjs` are the manifest's contract with the docs and the
website's theme builder; bump its `schemaVersion` when a field changes
meaning or goes away. Helpers the grid sets at runtime or inside a rule, such
as `--gridkit-body-height` and `--gridkit-pager-segment`, are not declared on
`:root` and are not tokens.

Names are `--gridkit-<part>-<property>` for a token that tunes one part
(`--gridkit-header-font-weight`), a short name for a base knob
(`--gridkit-radius`), and a colour's raw pair adds `-light` and `-dark`. A
token is `basic` if it is in the palette or is a base knob, `advanced`
otherwise. Add one only where someone would plausibly change that value on
its own; anything else derives from a base knob with `calc()`.

To add a token:

1. Declare it on `:root`. A colour is a raw pair,
   `--gridkit-<name>-light` and `--gridkit-<name>-dark`, plus the live
   `--gridkit-<name>`, pointed at its pair in all four palette blocks
   (`:root`, the `@variant dark` inside it, `.gridkit-light` and
   `.gridkit-dark`) and registered in `@theme inline` as
   `--color-gridkit-<name>: var(--gridkit-<name>)`. Anything else is one
   declaration on `:root`.
2. Read it in a rule with `var()`.
3. Add its entry to `tokens.json`, among its group's, with the default exactly
   as `styles.css` declares it (whitespace collapsed to single spaces). A
   colour's entry is named for the live token and gives both sides of the pair.
4. Regenerate the token tables on `docs/tokens.mdx`, then write any prose the
   new token needs around them:

   ```bash
   pnpm --filter @gridkitjs/theme-tailwind docs:tokens
   ```

Each group's table on that page sits between two MDX comments,
`{/* tokens:<group> */}` and `{/* /tokens:<group> */}`. The script rewrites
only what is between them, so never edit a table by hand: change
`tokens.json` and regenerate.

A default declared on `:root` may read only raw colours of its own side or
tokens that are not colours, for the reason the comment at the top of
`styles.css` gives.

## The plain-CSS build

[`@gridkitjs/theme-css`](../theme-css/AGENTS.md) is generated from
`src/styles.css`, and a test fails while it is stale. After changing the
stylesheet, regenerate it and commit both, with one changeset listing both
packages:

```bash
pnpm --filter @gridkitjs/theme-css build
```

The generator rewrites `@variant dark` and drops `@theme inline`, and fails
on any other Tailwind-only syntax and on CSS nesting; keep those out of the
stylesheet, or teach the generator first.

## What belongs here

Every style the grid has. The stylesheet targets the semantic class names
`@gridkitjs/react` renders; components carry no styles of their own (see
[packages/react/AGENTS.md](../react/AGENTS.md#styling)). The row stripe also
reads each row's `data-gridkit-row-index`, which holds under virtualization
where `:nth-child` does not; a test in `row-virtualization.spec.tsx` fails if
it stops working.

## Tests

`scripts/tokens.test.mjs` runs on Node's built-in test runner, with no
dependencies, as part of the root `pnpm test`:

```bash
pnpm --filter @gridkitjs/theme-tailwind test
```

It fails when a manifest entry is malformed or out of group order, when the
manifest and `:root` disagree on which tokens exist or on a default, when a
default reads a value the palette swaps, when a colour is missing from a palette block or
`@theme inline`, when no rule reads a token, or when the token tables on
`docs/tokens.mdx` differ from what `tokens.json` generates.

The Playwright suite mounts `DataGrid` against this stylesheet, so measured
widths and paddings come from it; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md), including the
stale-cache gotcha after editing `styles.css`.

## Docs

`packages/theme-tailwind/docs/`. The writing rules are in
[.claude/rules/docs.md](../../.claude/rules/docs.md). The token tables on
`tokens.mdx` are generated from `tokens.json`, as
[adding a token](#theme-tokens) describes.

## Releasing

Published, so a change to what it ships needs a changeset; tests,
docs and README edits do not. See
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
