# scripts

Node scripts for the docs pipeline and for package verification. Plain ESM
`.mjs`, no build step; run them from the repo root. How the docs pipeline
fits together (the manifest, the `revalidate-docs` workflow, the `docs-meta`
branch) is in
[.claude/rules/docs.md](../.claude/rules/docs.md#the-docs-manifest).

| Script                    | What it does                                                                    |
| ------------------------- | ------------------------------------------------------------------------------- |
| `build-docs-manifest.mjs` | Builds `docs-manifest.json`, the one file the website reads all docs from.      |
| `check-mdx-tags.mjs`      | Fails on any PascalCase tag in the docs that the website does not register.     |
| `pack-packages.mjs`       | Builds the published packages and packs each into a tarball under `.pack/`.     |
| `lint-packages.mjs`       | Lints the tarballs with publint and arethetypeswrong.                           |
| `smoke-packages.mjs`      | Installs the tarballs into the fresh apps under `smoke/` and runs their checks. |

## build-docs-manifest.mjs

The script's JSDoc typedefs are the manifest's contract with the website, so
a field changed there is a change to the website too; bump `schemaVersion`
when a field changes meaning or goes away.

To inspect the manifest locally, run `node scripts/build-docs-manifest.mjs`;
it writes the gitignored `docs-manifest.json` at the repo root, or to the
path given as its argument.

```bash
node scripts/build-docs-manifest.mjs
```

Dates come from `git log`, so a run needs the full history (the workflow
checks out with `fetch-depth: 0`), and a file with no commit yet gets `null`.

## check-mdx-tags.mjs

CI runs it after lint. While the hosted list is missing (a 404, before the
website first publishes it) it skips with a warning; any other failure to
read the list fails it. To run it locally against the website's current
tags, generate the list in the `gridkit-website` repo with
`node scripts/export-mdx-tags.mjs` and point the check at it:

```bash
MDX_TAGS_FILE=../gridkit-website/public/mdx-tags.json node scripts/check-mdx-tags.mjs
```

`MDX_TAGS_URL` points it at another hosted list instead.

## Package verification

Locally, `exports` resolves to `src/index.ts`; only `pnpm pack` and
`pnpm publish` apply `publishConfig`, which points it at `dist`. These three
scripts test what a consumer installs instead: the packed tarballs. CI runs
them in the `packages` job (check name `packages / verify`), from the
reusable `.github/workflows/verify-packages.yml`, on every pull request and
push to `main`.

```bash
node scripts/pack-packages.mjs && node scripts/lint-packages.mjs && node scripts/smoke-packages.mjs
```

- `pack-packages.mjs` builds, then runs `pnpm pack` in each package that is
  not `private`. Never `npm pack`: it rewrites neither `publishConfig` nor
  `workspace:` ranges. It empties the gitignored `.pack/`, writes the
  tarballs and `tarballs.json` (package name to file name) there, and prints
  the same map with absolute paths.
- `lint-packages.mjs` runs `publint --strict` on every tarball and
  `attw --profile esm-only` on each that ships types (all but
  `theme-tailwind`).
- `smoke-packages.mjs` copies each fixture under `smoke/` to a temp folder,
  points its `@gridkitjs/*` dependencies at the tarballs, then runs
  `npm install` and `npm run smoke` there, printing a failing step's output.
  Name fixtures to run only those: `node scripts/smoke-packages.mjs next-app`.
  `--keep` keeps the temp folder; it is always kept when a fixture fails.

Each script takes `--pack-dir <dir>` in place of `.pack/`.

The fixtures sit outside the pnpm workspace and ESLint, so nothing resolves
to source; their own builds type-check them. Each is a private package with
third-party versions pinned and no lockfile:

| Fixture       | Checks                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `vite-react/` | React, Vite and Tailwind: `tsc --noEmit` (with `skipLibCheck` off), `vite build`, the theme in the CSS. |
| `next-app/`   | A server component renders `DataGrid` directly; `next build` must prerender `/` with the grid's HTML.   |
| `node-xlsx/`  | Plain Node, no DOM: `@gridkitjs/export-xlsx` writes a workbook.                                         |

A fixture lists its `@gridkitjs/*` dependencies at version `*`, and the run
replaces each with its tarball. List the transitive ones too (`react` needs
`core` and `dom`): one fetched from the registry instead of a tarball fails
the run.
