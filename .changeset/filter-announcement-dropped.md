---
"@gridkitjs/react": patch
---

A filter applied from a filter menu, or a search typed in the toolbar's search box, that a controlled `filter` doesn't take is no longer announced later. Before, the "2 of 3 rows" or "2 rows found" announcement waited, and was read out at whatever render next showed that filter or search, such as the app taking it a while after.
