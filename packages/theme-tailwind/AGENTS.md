# @gridkitjs/theme-tailwind

The grid's stylesheet for Tailwind v4: palette tokens, dark mode and grid
styles, plus a separate stylesheet for the forms packages. Published.
`tailwindcss` is a peer dependency.

## Layout

The package ships `src/` as source, with no build step.

| Path              | What it holds                                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles.css`  | The stylesheet, exported as `@gridkitjs/theme-tailwind/styles.css`.                                                                                                                                                                                                                             |
| `src/forms.css`   | The forms stylesheet, exported as `@gridkitjs/theme-tailwind/forms.css`: the styles of the forms packages, which work with or without `styles.css` (see [The forms stylesheet](#the-forms-stylesheet)).                                                                                         |
| `src/tokens.json` | The token manifest, exported as `@gridkitjs/theme-tailwind/tokens.json`: every theme token's group, tier, type and default.                                                                                                                                                                     |
| `src/presets/`    | The presets, exported as `@gridkitjs/theme-tailwind/presets/*`: one token-only `<id>.css` each, and `index.json` listing them in display order.                                                                                                                                                 |
| `scripts/`        | Not shipped. The token, preset, selector and class-name tests, and the helpers they read the files with: `css.mjs` parses a stylesheet, `manifest.mjs` the manifest, `presets.mjs` the preset index. `token-docs.mjs` generates the docs' token tables, and `write-token-docs.mjs` writes them. |

There is no `typecheck` or `lint` script: `scripts/` is plain ESM `.mjs`
with JSDoc types, like the repo's own [scripts](../../scripts/AGENTS.md).

How the palette tokens and dark mode work (the `-light` and `-dark` pairs,
the app's own `dark:` variant, the `.gridkit-light` and `.gridkit-dark`
overrides) is explained in the comment at the top of `src/styles.css`. Keep
that comment current when the mechanism changes.

## Theme tokens

A theme token is a `--gridkit-*` custom property declared on `:root` in
`styles.css`, or, for a token only forms read, on `:where(:root)` in
`forms.css`, and every one is listed in `tokens.json`. The JSDoc typedefs in
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

5. Add it to `src/presets/default.css` at its default, among its group's,
   then copy the presets into theme-css (see [the plain-CSS build](#the-plain-css-build)).

Each group's table on that page sits between two MDX comments,
`{/* tokens:<group> */}` and `{/* /tokens:<group> */}`. The script rewrites
only what is between them, so never edit a table by hand: change
`tokens.json` and regenerate.

A default declared on `:root` may read only raw colours of its own side or
tokens that are not colours, for the reason the comment at the top of
`styles.css` gives.

## The forms stylesheet

`src/forms.css` styles the forms packages
([`forms`](../forms/AGENTS.md) and the packages under it), whose every
class starts with `gridkit-forms-`. It has to work alone, in an app with no
grid, and beside `styles.css` in either order, so:

- It declares the palette, the nine `basic` colours, and every other shared
  token its rules read, each with `styles.css`'s default, on
  `:where(:root)` rather than `:root`. At no specificity, a preset or an
  app's own `:root` overrides win wherever they are loaded; the comment at
  the top of the file says why that matters.
- Its colours are wired as in `styles.css`: a live name pointed at its pair
  in `:where(:root)`, the `@variant dark` inside it, `.gridkit-light` and
  `.gridkit-dark`, and registered in `@theme inline`.
- A token only forms read is `--gridkit-forms-<part>-<property>`, declared
  in `forms.css` alone, and listed in `tokens.json` like any other.

So adding a token to `forms.css` follows the steps above with
`:where(:root)` in place of `:root`, and a rule there reading a shared
token it does not yet declare copies that token's declaration from
`styles.css`.

## Presets

A preset is a stylesheet in `src/presets/` that restyles the grid when
loaded after `styles.css`. It is one `:root` block that sets only theme
tokens, a colour through its raw `-light`/`-dark` pair, under a comment
that opens `GridKit preset: <label>.` and says how to import it. Never a
selector or a rule: a preset is token values only, so the website's theme
builder can load it as a starting point.

`default.css` sets every token to its default, as the template a consumer
copies; the others each change several groups, not only the colours.
`index.json` lists every preset as `{ id, label, description, file }`, in
display order with `default` first; its typedefs, the contract with the
theme builder, are in `scripts/presets.mjs`. To add a preset, add its file
and its entry, and a line for it on `docs/presets.mdx`.

theme-css ships the same files, copied by its build, so after changing a
preset run `pnpm --filter @gridkitjs/theme-css build` and commit both.

## The plain-CSS build

[`@gridkitjs/theme-css`](../theme-css/AGENTS.md) is generated from
`src/styles.css` and `src/forms.css`, and a test fails while either copy is
stale. After changing a stylesheet, regenerate it and commit both, with one
changeset listing both packages:

```bash
pnpm --filter @gridkitjs/theme-css build
```

The generator rewrites `@variant dark` and drops `@theme inline`, and fails
on any other Tailwind-only syntax and on CSS nesting; keep those out of the
stylesheet, or teach the generator first.

## What belongs here

Every style the grid has, and in `forms.css` every style the forms
packages have. Each targets the semantic class names its components
render, `@gridkitjs/react`'s or `@gridkitjs/forms`'s; components carry no
styles of their own (see [packages/react/AGENTS.md](../react/AGENTS.md#styling)). The row stripe also
reads each row's `data-gridkit-row-index`, which holds under virtualization
where `:nth-child` does not; a test in `row-virtualization.spec.tsx` fails if
it stops working.

## Tests

The tests in `scripts/` run on Node's built-in test runner, with no
dependencies, as part of the root `pnpm test`:

```bash
pnpm --filter @gridkitjs/theme-tailwind test
```

`scripts/tokens.test.mjs` fails when a manifest entry is malformed or out of group order, when the
manifest and `styles.css`'s `:root` disagree on which shared tokens exist or on a default, when
`forms.css`'s `:where(:root)` lacks a forms token, the palette or a shared token
its rules read, or declares any other, or a default other than the manifest's, when a
default reads a value the palette swaps, when a colour is missing from a palette block or
`@theme inline`, when no rule in either stylesheet reads a token, or when the token tables on
`docs/tokens.mdx` differ from what `tokens.json` generates.

`scripts/presets.test.mjs` fails when `index.json` is malformed or
disagrees with the files in `src/presets/`, when `default.css` differs from
the manifest's defaults, when a preset is anything but one commented `:root`
block of tokens or sets a colour by its live name, or when a preset's
`fg` on `surface`, or `fg-muted` on `surface`, `surface-muted` or
`selected`, falls under WCAG AA's 4.5:1 in either mode (7:1 for High
contrast).

`scripts/selectors.test.mjs` fails when a selector in `styles.css` or
`forms.css`, other than `:root` and `:where(:root)`, names no `gridkit-`
class, so every rule stays inside GridKit's elements and none restyles a
host page's own.

`scripts/class-names.test.mjs` fails when a class or `data-gridkit-*`
attribute written in `core`, `dom` or `react` source is missing from the
tables on `docs/class-names.mdx`, or the page lists one no source writes. A
name built at run time (`is-sorted-${direction}`) is covered by any listed
name that starts with its prefix. Rename or add a class, and its row on that
page changes in the same commit. It also fails when `forms-core`,
`forms-dom` or `forms` writes a class that does not start with
`gridkit-forms-`.

The Playwright suite mounts `DataGrid` against this stylesheet, so measured
widths and paddings come from it; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md), including the
stale-cache gotcha after editing `styles.css`.

## Docs

`packages/theme-tailwind/docs/`. The writing rules are in
[.claude/rules/docs.md](../../.claude/rules/docs.md). The token tables on
`tokens.mdx` are generated from `tokens.json`, as
[adding a token](#theme-tokens) describes. `class-names.mdx` is the reference
for every class and data attribute the grid renders, held to the source by
its test.

## Releasing

Published, so a change to what it ships needs a changeset; tests,
docs and README edits do not. See
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
