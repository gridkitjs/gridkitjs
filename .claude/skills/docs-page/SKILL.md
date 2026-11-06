---
name: docs-page
description: Write or update a GridKit docs page under packages/*/docs/. Use when a public API, component or prop is added, or its behaviour changes, so the page ships in the same PR, or when asked to write, fix or restructure a docs page.
---

# Write or update a docs page

A new public API, component or prop needs a page or a section in the same
change; changed behaviour needs its page updated. The policy and the style
rules are in [.claude/rules/docs.md](../../rules/docs.md); this is the
procedure.

## 1. Find or create the page

- Search the docs for the feature first (`grep -rl "sortableColumns" packages/*/docs`):
  an existing page usually wants a new section rather than a new page.
- A new page goes in the package that owns the API (`packages/<pkg>/docs/`,
  or a topic subfolder such as `packages/react/docs/columns/`). Add its file
  name, without `.mdx`, to that folder's `_meta.json` `order` at the right
  position.
- Frontmatter: a sentence-case `title` and a `description` under 160
  characters.

## 2. Follow the template

Write the sections in the order of the
[page template](../../rules/docs.md#page-template), leaving out any with
nothing to say. Read a model page before starting:
`packages/react/docs/columns/column-sorting.mdx` or
`packages/react/docs/server-side-data.mdx`.

## 3. Add the example

- A live example is a bare tag on its own line, named exactly as in
  `https://next.gridkitjs.com/mdx-tags.json`. See
  [Live examples](../../rules/docs.md#live-examples).
- If the page needs an example that doesn't exist yet, build it in the
  `gridkit-website` repo, in a PR into its `development` branch. That
  deploys to next.gridkitjs.com, where you can preview it, and it reaches
  production with the release. Until it is merged there, use a complete code
  sample; don't add an unregistered tag.

## 4. Check every code sample

Each sample is complete: imports, the row type, inline rows and columns, an
exported component. For each one:

1. Paste it into a new file under `apps/playground/src/`, for example
   `apps/playground/src/DocsSample.tsx`.
2. Run both checks:

   ```bash
   pnpm --filter playground typecheck
   pnpm --filter playground lint
   ```

3. Fix the sample in the page, not just the file, until both pass.
4. Delete the file.

## 5. Update the shared tables

- A new recurring term: define it once in the "Terms" section of
  `packages/react/docs/overview.mdx` and link to it from the page.
- A new `@gridkitjs/dom` export: add it to the "Exports by page" table in
  `packages/dom/docs/overview.mdx`, and to its page's `## Types` table or a
  section of its own.

## 6. Check the tags

```bash
node scripts/check-mdx-tags.mjs
```

It fails on any tag the website doesn't register; fix the file and line it
names. To check against the website's unpublished tags, see
[scripts/AGENTS.md](../../../scripts/AGENTS.md#check-mdx-tagsmjs).

## 7. Final pass

Reread the page against [Code samples and style](../../rules/docs.md#code-samples-and-style),
[Terminology](../../rules/docs.md#terminology) and [Keys](../../rules/docs.md#keys),
then run `pnpm format:check`. The page renders only in `gridkit-website`.
