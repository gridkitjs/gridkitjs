---
"@gridkitjs/core": patch
---

`goToPage`, `nextPage`, `previousPage` and `setPageSize` no longer fire
`onPaginationChange` or call subscribers when they leave the pagination as it
was — `nextPage()` on the last page, `previousPage()` on the first,
`goToPage()` to the page already shown. A controlled grid is no longer asked
for the page it already has.
