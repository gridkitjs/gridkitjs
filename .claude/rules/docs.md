---
paths:
  - "packages/*/docs/**"
---

# Docs

This rule applies to the docs pages under `packages/*/docs/`: how they reach
the website, when a change needs one, and how a page is written.

## Where docs live

Each published package keeps its own docs as `.mdx` under
`packages/<pkg>/docs/`, with page order controlled by that folder's
`_meta.json`. Nested topics live in subfolders with their own `_meta.json` —
e.g. `packages/react/docs/columns/`. They are rendered by the
`gridkit-website` repo — there is no docs build here, so `.mdx` changes can
only be previewed there: at [next.gridkitjs.com](https://next.gridkitjs.com)
after the PR merges, or locally against a branch's manifest (see
[The docs manifest](#the-docs-manifest)). The production site,
`gridkitjs.com`, shows them only after the next release.

## The docs manifest

The website does not find those files by listing the repo. It reads a
single `docs-manifest.json`, built by `scripts/build-docs-manifest.mjs`, an
index: every published package's name, `version` and `CHANGELOG.md`, every
`.mdx` page with its frontmatter, and every parsed `_meta.json`, each page
and changelog with its git blob SHA and last commit date. The page and
changelog bodies are not in it; the website fetches each from GitHub by its
blob SHA. A local preview of unpushed docs builds the manifest with the
bodies in place, with `--inline-bodies`. Its contract with the website, and how to run it
locally, are in [scripts/AGENTS.md](../../scripts/AGENTS.md).

`scripts/publish-docs-manifest.mjs` commits it, as the only file, to an
orphan manifest branch (`main` is protected, so it cannot live there). There
are three, one per channel:

| Branch               | Written by                                                                                                           | Read by                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `docs-meta`          | The release workflow, after a stable release or a docs-only one, once the `release` environment's reviewer approves. | `gridkitjs.com`, at a pinned commit SHA.    |
| `docs-meta-next`     | The `docs-preview` workflow, on every push to `main` touching a package's `docs/`, `CHANGELOG.md` or `package.json`. | `next.gridkitjs.com`.                       |
| `docs-meta-<branch>` | The `docs-preview` workflow, run by hand on that branch from the Actions tab (slashes become dashes).                | The website's `DOCS_MANIFEST_REF`, locally. |

So a docs change reaches the next site when it merges and the live site
with the next release: the release hands the website the new `docs-meta`
commit, and the website's own release PR moves its pin. On `main`,
`docs-preview` also POSTs a signed `{ ref, sha, manifestSha, ts }` to the
next site's revalidation webhook (`vars.WEBSITE_NEXT_REVALIDATE_URL`; while
it is unset the request is skipped with a notice). A branch preview notifies
nothing. Never commit to a manifest branch by hand; every commit on one is a
workflow's.

## Keeping docs current

Keeping these current is a priority, not a follow-up task. A new public API,
component, or prop needs a doc page — or a new section on an existing one —
in the same change that adds it; a change in behaviour needs the existing
page updated to match. Treat this with the same weight as the changeset
requirement in [versioning.md](versioning.md): a PR that changes public
behaviour without updating docs has not finished, the same way one without a
changeset hasn't. The two rules are complementary — code changes need a
changeset, user-facing changes need docs, and a PR can need either, both, or
neither depending on what changed.

## Page template

A new page follows one template, in this order, leaving out a section with
nothing to say:

1. A lead sentence: what the feature is and why, its props in backticks.
2. When to use it.
3. A minimal example: the page's live example tag, or a complete sample.
4. Props, as a `Prop | Type | Default | Description` table.
5. Behaviour, one section per rule worth knowing.
6. Events and callbacks.
7. Keyboard and pointer, with `<Kbd>`.
8. Reading the state outside the grid: its hook, or the `ref`.
9. Messages and localization.
10. `## See also`: the `core` counterpart and the related pages.

`react/docs/columns/column-sorting.mdx` and `react/docs/server-side-data.mdx`
are models; existing pages are being brought to it.

## Code samples and style

Every code sample is complete, so a reader can paste it into a new app:
imports, the row type, inline rows and columns, and an exported component.
Check one by pasting it into a file under `apps/playground/src/`, running
`pnpm --filter playground typecheck` and `pnpm --filter playground lint`,
then deleting the file. A fence holding JSX is `tsx`; give it a
`title="App.tsx"` when it is a whole file. Headings are in sentence case,
`description` stays under 160 characters, and new prose uses commas, colons
or parentheses rather than em dashes. Prefer the table headers the website
sets in monospace (`Prop`, `Field`, `Function`, `Option`, `Type`, `Default`,
`Key`, `Class`, `Member`, `Method`) for columns of code.

## Terminology

One word per idea, across every package: "pagination", not "paging";
"row grouping" for the feature, not "grouping"; "column definitions";
"autofit", one word and lowercase. The "Terms" section of
`packages/react/docs/overview.mdx` is the glossary: define a new recurring
term there and link to it, rather than defining it again on each page.

## Keys

Reference actual key presses with `<Kbd>` — `<Kbd>Ctrl</Kbd>+<Kbd>A</Kbd>`,
not backtick text like `` `Ctrl+A` ``. `<Kbd>` is globally available in
rendered docs (registered in `gridkit-website`'s MDX component map), so it
needs no import. Reserve it for keys, not mouse actions worded with "click"
or "drag".

## Website primitives

The website registers a few more content primitives the same way, so reach
for them instead of faking one with a heading. MDX expressions are stripped
there, so every prop is a string: write `dev="true"`, never `dev={true}`.

- `<Callout type="warning" title="Not with paging">…</Callout>` — an aside;
  `type` is `note`, `tip`, `warning` or `breaking`, `title` is optional.
- `<PackageInstall pkg="@gridkitjs/react @gridkitjs/theme-tailwind" />` —
  the install command with npm, pnpm, yarn and bun tabs; add `dev="true"`
  for a dev dependency. Use it instead of an npm-only `bash` fence.
- `<Since v="0.12.0" pkg="react" />` — an inline "since version" badge;
  `pkg` is the package without its scope, and optional.
- `<LinkCards><LinkCard href="/docs/core/sorting" title="Sorting" description="…" /></LinkCards>`
  — a grid of link cards for a page's next steps.
- Code fence meta: ` ```tsx title="App.tsx" {2,4-5} showLineNumbers wrap `
  gives a title bar, highlighted lines, line numbers and wrapped lines; in
  the code, `// [!code highlight]`, `// [!code ++]`, `// [!code --]` and
  `// [!code focus]` mark single lines.

The full list of registered tags is served at
`https://next.gridkitjs.com/mdx-tags.json`; a tag missing from it renders as
literal text. The next site holds every tag the live site has, plus the
examples for features merged here but not yet released.

## Live examples

Live examples are tags too. Each one renders the real `DataGrid` in a frame
with its title and description, a Preview and a Code tab, Reset and "Open in
StackBlitz", so a page needs only the bare tag, on a line of its own:
`<ColumnSortingExample />`. Copy the name exactly from `mdx-tags.json`. The
one prop an example tag takes is an optional `title`, replacing the
example's own. Don't wrap one in `<LiveExampleFrame>` (it still works, but
only passes its title on), and don't repeat the example's code in a fence
below it — the Code tab already shows it; a fence that shows something the
example doesn't is fine. The examples live in the
`gridkit-website` repo, so a page that needs a new one gets it built there
first: a PR into the website's `development` branch, which deploys to
[next.gridkitjs.com](https://next.gridkitjs.com), where it can be previewed.
It reaches production with the release. Once it is merged into
`development`, its tag is on the next site's list and the page here can use
it (see [Tag check](#tag-check)).
`<StackblitzExample path="...">` is a link-only box to a project under
`examples/`; keep it for a whole app setup an inline example can't show.

## Tag check

`scripts/check-mdx-tags.mjs` holds the docs to that list: it collects every
PascalCase tag in `packages/*/docs/**/*.mdx`, ignoring fenced code, code
spans and comments, and fails with the file and line of any tag the website
does not register. It reads the next site's list, not the live site's:
docs ship to `gridkitjs.com` only with a release, and by then the website's
`development` branch, which deploys to `next.gridkitjs.com`, has reached its
`main` along with the examples a release's pages use. So a page can use a
new example's tag as soon as the example is merged into `development`, in
the same PR as the feature. How CI runs it and how to run it locally
against the website's current tags are in
[scripts/AGENTS.md](../../scripts/AGENTS.md).
