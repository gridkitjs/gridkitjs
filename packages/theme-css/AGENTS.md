# @gridkitjs/theme-css

The grid's stylesheet as plain CSS, for consumers not using Tailwind.
Published. It has no dependencies, peer or otherwise.

## Layout

| Path                           | What it holds                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/styles.css`               | The stylesheet, exported as `@gridkitjs/theme-css/styles.css`. **Generated: never edit it by hand.**         |
| `scripts/stylesheet.mjs`       | Not shipped. Generates the stylesheet from [theme-tailwind's](../theme-tailwind/AGENTS.md) `src/styles.css`. |
| `scripts/write-stylesheet.mjs` | Not shipped. Writes it to `src/styles.css`; the package's `build` script.                                    |
| `scripts/stylesheet.test.mjs`  | Not shipped. Fails when `src/styles.css` is stale, and covers the generator.                                 |

## The stylesheet is generated

`src/styles.css` is theme-tailwind's stylesheet with its Tailwind-only syntax
rewritten, so the two packages can't drift. To change a style or a token,
edit `packages/theme-tailwind/src/styles.css`, then regenerate and commit
both files together:

```bash
pnpm --filter @gridkitjs/theme-css build
```

The generator moves `@variant dark` out of `:root` into a
`@media (prefers-color-scheme: dark)` block placed before `.gridkit-light`
and `.gridkit-dark`, drops `@theme inline`, and replaces the source's header
comments with its own. It throws on any other at-rule it doesn't know, on
CSS nesting and on Tailwind's functions (`--spacing()`, `--alpha()`,
`theme()`), so a Tailwind-only construct added to the source fails the
build rather than shipping. Teach `scripts/stylesheet.mjs` to rewrite it,
or keep it out of the source.

The token manifest, `tokens.json`, and the token docs live in theme-tailwind
only; this package's docs link to them.

## Tests

`scripts/stylesheet.test.mjs` runs on Node's built-in test runner as part of
the root `pnpm test`:

```bash
pnpm --filter @gridkitjs/theme-css test
```

The smoke fixture `scripts/smoke/vite-css/` installs the packed tarball into
a Vite app without Tailwind; see
[scripts/AGENTS.md](../../scripts/AGENTS.md#package-verification).

## Docs

`packages/theme-css/docs/`. The writing rules are in
[.claude/rules/docs.md](../../.claude/rules/docs.md). Link to theme-tailwind's
pages for the tokens and class names rather than repeating them.

## Releasing

Published, so a change to `src/styles.css` needs a changeset. Since every
change to theme-tailwind's shipped CSS regenerates it, that changeset lists
both packages; see
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
