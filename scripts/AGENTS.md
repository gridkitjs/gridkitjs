# scripts

Node scripts for the docs pipeline, package verification and the release
workflow. Plain ESM `.mjs`, no build step; run them from the repo root. How
the docs pipeline fits together (the manifest, its three channel branches,
the workflows that write them) is in
[.claude/rules/docs.md](../.claude/rules/docs.md#the-docs-manifest).

| Script                       | What it does                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `build-docs-manifest.mjs`    | Builds `docs-manifest.json`, the index the website reads all docs from.          |
| `publish-docs-manifest.mjs`  | Builds the manifest and commits it to a `docs-meta*` branch.                     |
| `notify-docs-revalidate.mjs` | Sends a website deployment the signed request that revalidates its docs.         |
| `check-mdx-tags.mjs`         | Fails on any PascalCase tag in the docs that the website does not register.      |
| `pack-packages.mjs`          | Builds the published packages and packs each into a tarball under `.pack/`.      |
| `lint-packages.mjs`          | Lints the tarballs with publint and arethetypeswrong.                            |
| `smoke-packages.mjs`         | Installs the tarballs into the fresh apps under `smoke/` and runs their checks.  |
| `release-plan.mjs`           | Decides whether a release run publishes a snapshot, a stable release or nothing. |
| `publish-tarballs.mjs`       | Publishes the verified tarballs to npm, skipping versions npm already has.       |
| `github-releases.mjs`        | Tags a stable release and writes GitHub Releases from the changelogs.            |
| `website-dispatch.mjs`       | Tells the website which versions to install after a snapshot or a release.       |
| `bump-examples.mjs`          | Moves the apps under `examples/` to the released versions.                       |

## Tests

A script's tests sit beside it as `*.test.mjs` and run on Node's built-in
test runner, with no dependencies; `pnpm test` runs them after the
packages' Vitest suites. To run only these:

```bash
node --test "scripts/**/*.test.mjs"
```

## build-docs-manifest.mjs

The script's JSDoc typedefs are the manifest's contract with the website, so
a field changed there is a change to the website too; bump `schemaVersion`
when a field changes meaning or goes away.

The manifest is an index: it carries each page's frontmatter and each
changelog's date, but not their bodies. Every page and `CHANGELOG.md` has
its git blob SHA, and the website fetches each body from GitHub's git blobs
API by that SHA, a response it caches for good. That keeps the manifest at
tens of KB however the docs grow, well under the 2 MB above which Next's
fetch cache stops caching it.

To inspect the manifest locally, run `node scripts/build-docs-manifest.mjs`;
it writes the gitignored `docs-manifest.json` at the repo root, or to the
path given as its argument.

```bash
node scripts/build-docs-manifest.mjs
```

`--inline-bodies` writes every body into the manifest as well: each page's
without its frontmatter, each changelog whole. A local preview needs it,
because the website fetches a body by its blob SHA and GitHub holds no blob
for a change that is not pushed. Build with it, then point the website's
`DOCS_MANIFEST_FILE` at the file, as the `gridkit-website` repo's
`lib/docs/AGENTS.md` describes:

```bash
node scripts/build-docs-manifest.mjs --inline-bodies
```

`publish-docs-manifest.mjs` never passes it: a published manifest's files
are in a pushed commit, so their blobs are on GitHub.

Dates come from `git log`, so a run needs the full history (the workflow
checks out with `fetch-depth: 0`), and a file with no commit yet gets `null`.

## publish-docs-manifest.mjs and notify-docs-revalidate.mjs

The docs workflows run these through the composite action
`.github/actions/publish-docs-manifest`, so `docs-preview.yml` and
`release.yml` publish a manifest the same way.

- `publish-docs-manifest.mjs --branch <name> [--dry-run]` builds the
  manifest and commits it with git plumbing on top of the branch's tip on
  `origin`, then pushes; a rejected push is retried on the new tip. The
  branch must be `docs-meta` or `docs-meta-*`, and slashes become dashes.
  It prints `{ branch, sourceSha, parent, manifestSha, pushed }`.
  `--dry-run` makes the commit locally and pushes nothing.
- `notify-docs-revalidate.mjs --url <url> --manifest-sha <sha> [--dry-run]`
  POSTs the signed `{ ref, sha, manifestSha, ts }` to a revalidation
  webhook, with the secret from `DOCS_REVALIDATE_SECRET`. An empty `--url`
  skips it with a notice. `--dry-run` prints the body.

```bash
node scripts/publish-docs-manifest.mjs --branch docs-meta-next --dry-run
```

## check-mdx-tags.mjs

CI runs it after lint, against `https://next.gridkitjs.com/mdx-tags.json`:
the next site, which carries the examples for features merged here but not
yet released (why is in
[.claude/rules/docs.md](../.claude/rules/docs.md#tag-check)). While that
list is missing (a 404, or the host not resolving before the next site is
first deployed) it skips with a warning; any other failure to read the list
fails it. To run it locally against the website's current tags, generate
the list in the `gridkit-website` repo with
`node scripts/export-mdx-tags.mjs` and point the check at it:

```bash
MDX_TAGS_FILE=../gridkit-website/public/mdx-tags.json node scripts/check-mdx-tags.mjs
```

`MDX_TAGS_URL` points it at another hosted list instead.

## Package verification

Locally, `exports` resolves to the source under `src/`; only `pnpm pack` and
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
  the two themes, `theme-tailwind` and `theme-css`).
- `smoke-packages.mjs` copies each fixture under `smoke/` to a temp folder,
  points its `@gridkitjs/*` dependencies at the tarballs, then runs
  `npm install` and `npm run smoke` there, printing a failing step's output.
  Name fixtures to run only those: `node scripts/smoke-packages.mjs next-app`.
  `--keep` keeps the temp folder; it is always kept when a fixture fails.

Each script takes `--pack-dir <dir>` in place of `.pack/`.

The fixtures sit outside the pnpm workspace and ESLint, so nothing resolves
to source; their own builds type-check them. Each is a private package with
third-party versions pinned and no lockfile:

| Fixture       | Checks                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `vite-react/` | React, Vite and Tailwind: `tsc --noEmit` (with `skipLibCheck` off), `vite build`, the theme and a preset in the CSS.                      |
| `vite-css/`   | React and Vite without Tailwind: `tsc --noEmit`, `vite build`, the plain-CSS theme's rules, tokens, dark palette and a preset in the CSS. |
| `next-app/`   | A server component renders `DataGrid` directly; `next build` must prerender `/` with the grid's HTML.                                     |
| `node-xlsx/`  | Plain Node, no DOM: `@gridkitjs/export-xlsx` writes a workbook, and a building block from `@gridkitjs/core/renderer` runs.                |

A fixture lists its `@gridkitjs/*` dependencies at version `*`, and the run
replaces each with its tarball. List the transitive ones too (`react` needs
`core` and `dom`): one fetched from the registry instead of a tarball fails
the run.

## Release scripts

`.github/workflows/release.yml` runs these on every push to `main`; its
steps stay thin so the logic can be run, and read, here. Shared helpers are
in `lib/release.mjs`.

- `release-plan.mjs [--since <commit>] [--mode auto|docs-only]` prints the
  plan as JSON: `snapshot` while changesets are pending and a published
  package's `src/` changed since `--since` (always, without it), `stable`
  when none are pending and a version is not on npm or not tagged, else
  `none`. It asks npm and `git ls-remote`, so it needs the network.
- `publish-tarballs.mjs [--pack-dir <dir>] [--tag <dist-tag>] [--dry-run]`
  runs `npm publish <tarball>` in dependency order for each version npm
  lacks. It refuses to publish outside GitHub Actions, where trusted
  publishing authenticates it; `--dry-run` runs `npm publish --dry-run`.
- `github-releases.mjs [--packages <json>] [--sha <commit>] [--dry-run]`
  creates the missing `@gridkitjs/<pkg>@<version>` tags and GitHub Releases,
  with each version's `CHANGELOG.md` section as the notes. `--dry-run`
  prints them instead.
- `website-dispatch.mjs --event <event> [--versions <json>] [--dry-run]`
  (its header lists every option) sends the website a `repository_dispatch`
  with the versions to install: after a snapshot, `{ sha, versions, manifestRef: "docs-meta-next" }`;
  after a stable or docs-only release, `{ sha, versions, manifestSha }`,
  `manifestSha` being the new `docs-meta` commit. `versions` always names
  every published package at an exact version; without `--versions` it is each
  `package.json` version, which must be on npm. These payloads are the
  contract with the website's receiving workflows, which validate them
  strictly. `--dry-run` prints the event and payload.
- `bump-examples.mjs [--versions <json>] [--dry-run]` sets each example's
  `@gridkitjs/*` ranges to `^<version>` and refreshes its lockfile with
  `npm install --package-lock-only`, retrying while npm catches up with a
  version just published. The workflow then opens the PR. `--dry-run`
  prints the diff.

To rehearse a snapshot locally, on a branch with a committed changeset,
version, pack and dry-run the publish. `changeset version` rewrites
versions and changelogs and deletes the changesets it consumed, so the last
line restores them all from git (a changeset that was never committed would
be lost):

```bash
pnpm changeset version --snapshot dev
node scripts/pack-packages.mjs && node scripts/lint-packages.mjs
node scripts/publish-tarballs.mjs --tag dev --dry-run
git checkout -- packages .changeset
```
