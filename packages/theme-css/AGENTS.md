# @gridkitjs/theme-css

The grid's stylesheet as plain CSS, for consumers not using Tailwind, and
the forms stylesheet beside it. Published. It has no dependencies, peer or
otherwise.

## Layout

| Path                           | What it holds                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles.css`               | The stylesheet, exported as `@gridkitjs/theme-css/styles.css`. **Generated: never edit it by hand.**                               |
| `src/forms.css`                | The forms stylesheet, exported as `@gridkitjs/theme-css/forms.css`. **Generated: never edit it by hand.**                          |
| `scripts/stylesheet.mjs`       | Not shipped. Generates both stylesheets from [theme-tailwind's](../theme-tailwind/AGENTS.md) `src/styles.css` and `src/forms.css`. |
| `scripts/write-stylesheet.mjs` | Not shipped. Writes them to `src/styles.css` and `src/forms.css`; run by the `build` script.                                       |
| `scripts/stylesheet.test.mjs`  | Not shipped. Fails when either stylesheet is stale, and covers the generator.                                                      |
| `src/presets/`                 | The presets, exported as `@gridkitjs/theme-css/presets/*`. **Copied: never edit them by hand.**                                    |
| `scripts/presets.mjs`          | Not shipped. Where the presets are copied from and to.                                                                             |
| `scripts/copy-presets.mjs`     | Not shipped. Replaces `src/presets/` with theme-tailwind's; run by the `build` script after the stylesheet.                        |
| `scripts/presets.test.mjs`     | Not shipped. Fails when `src/presets/` differs from theme-tailwind's.                                                              |

## The stylesheets are generated

`src/styles.css` and `src/forms.css` are theme-tailwind's stylesheets with
their Tailwind-only syntax rewritten, so the two packages can't drift. To
change a style or a token, edit the file in `packages/theme-tailwind/src/`,
then regenerate and commit both packages' files together:

```bash
pnpm --filter @gridkitjs/theme-css build
```

The generator moves `@variant dark` out of the rule declaring the palette
(`:root`, or `:where(:root)` in `forms.css`) into a
`@media (prefers-color-scheme: dark)` block on the same selector, placed
before `.gridkit-light` and `.gridkit-dark`, drops `@theme inline`, and
replaces the source's header comments with its own. It throws on any other at-rule it doesn't know, on
CSS nesting and on Tailwind's functions (`--spacing()`, `--alpha()`,
`theme()`), so a Tailwind-only construct added to the source fails the
build rather than shipping. Teach `scripts/stylesheet.mjs` to rewrite it,
or keep it out of the source. A new stylesheet is one more entry in its
`STYLESHEETS` list.

## The presets are copied

`src/presets/` holds theme-tailwind's presets and their `index.json`,
copied byte for byte: a preset sets only tokens on `:root`, which is plain
CSS already. To change one, edit it in `packages/theme-tailwind/src/presets/`
(its rules are in [theme-tailwind's AGENTS.md](../theme-tailwind/AGENTS.md#presets)),
then run the same `build` and commit the files in both packages.

The token manifest, `tokens.json`, the token docs and the presets page live
in theme-tailwind only; this package's docs link to them.

## Tests

`scripts/stylesheet.test.mjs` and `scripts/presets.test.mjs` run on Node's
built-in test runner as part of the root `pnpm test`:

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

Published, so a change to `src/styles.css`, `src/forms.css` or
`src/presets/` needs a changeset. Since every change to theme-tailwind's shipped CSS regenerates it, that changeset lists
both packages; see
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
