# scripts

Node scripts for the docs pipeline. Plain ESM `.mjs`, no build step; run them
from the repo root. How the docs pipeline fits together (the manifest, the
`revalidate-docs` workflow, the `docs-meta` branch) is in the root
[Docs](../AGENTS.md#docs) section.

| Script                    | What it does                                                                |
| ------------------------- | --------------------------------------------------------------------------- |
| `build-docs-manifest.mjs` | Builds `docs-manifest.json`, the one file the website reads all docs from.  |
| `check-mdx-tags.mjs`      | Fails on any PascalCase tag in the docs that the website does not register. |

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
