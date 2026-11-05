---
"@gridkitjs/core": minor
---

`paginationWindow` now returns the same number of entries for every page once `pageCount` exceeds `2 * boundaryCount + 2 * siblingCount + 3` (7 with the defaults), so a numbered pager no longer grows and shrinks as the user pages through. Near either end the run of sibling pages slides inwards instead of being cut short: page 1 of 10 gives `[1, 2, 3, 4, 5, "ellipsis", 10]` where it gave `[1, 2, "ellipsis", 10]`, and page 10 of 10 gives `[1, "ellipsis", 6, 7, 8, 9, 10]` where it gave `[1, "ellipsis", 9, 10]`. Middle pages and page counts small enough to show every page are unchanged.
