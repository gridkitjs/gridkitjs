---
"@gridkitjs/react": minor
---

A grid with no rows to show now says so: under the header, one row spanning every column reads `messages.noMatchingRows` ("No rows match the current filter") while a filter or the toolbar's search is active, and `messages.noRows` ("No rows to show") otherwise. Before, the body was blank. The row (`tr.gridkit-grid-empty-row`, holding `td.gridkit-grid-empty-cell` and `div.gridkit-grid-empty-content`) is not counted in `aria-rowcount` and takes no focus. It is not drawn in a grid with no columns, or while `infiniteScroll.hasMore` is `true`.

The new `emptyTemplate` prop replaces the message's content. It receives an `EmptyTemplateContext`, `{ filtered: boolean }`, exported from the package entry; a template returning `null` leaves the body blank.

The built-in pager of a grid with no rows reads "Page 1 of 1" with every button unavailable, where it read "Page 0 of 0", and a page-size change there announces page 1 of 1. `getPageCount()`, `onPaginationChange` and `pager.template` still report a page count of `0`.
