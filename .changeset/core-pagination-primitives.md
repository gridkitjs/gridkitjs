---
"@gridkitjs/core": minor
---

Pagination primitives: `paginateRows` slices a `DisplayRow<Row>[]` into pages, treating a top-level group and its whole subtree as one unit so a page never splits a group. New exports: `paginateRows`, and the types `PaginationState`/`PaginationChangeEvent`.

Breaking: `ResolvedRow`/`ResolvedGroupRow`/`CellTemplateContext` gain a required `datasetIndex` field — a row's absolute position in the whole filtered/sorted/grouped dataset, distinct from `rowIndex` (which is scoped to what's currently rendered — the page, once pagination is in use). A caller constructing either of these directly, or reading a template context, needs to account for the new field.
