---
"@gridkitjs/theme-tailwind": minor
---

Printing the page with the browser's own print (Ctrl+P) now shows the grid as
a plain table: an `@media print` block hides the toolbar, the group-by bar, the
pager and the resize handles, lets a `height`-bound grid's drawn rows flow
onto as many pages as they take, keeps header shading, and never splits a row
across two pages. It prints only the rows the grid has drawn; the grid's own
Print prints every row.
