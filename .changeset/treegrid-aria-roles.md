---
"@gridkitjs/react": minor
---

`DataGrid`'s header, body and footer `<table>` elements are now `role="presentation"`, and their `<thead>`, `<tbody>` and `<tfoot>` carry `role="rowgroup"`, so every row and cell belongs to the `grid` or `treegrid` element instead of to a native table. A grouped grid's group rows keep `aria-level`, `aria-expanded`, `aria-posinset` and `aria-setsize`, which are now valid there; screen readers stop announcing a table inside the grid, and the axe `aria-required-children` and `aria-conditional-attr` violations are gone. Class names and keyboard behaviour are unchanged.

A test that found the grid's markup by the `table` role no longer matches. Query the grid instead, or a class name:

```ts
// Before
page.getByRole("table");
// After
page.getByRole("grid"); // or "treegrid" while grouped
page.locator(".gridkit-data-grid-header"); // one table, by class
```
