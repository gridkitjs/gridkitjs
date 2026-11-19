---
"@gridkitjs/core": minor
---

Adds `countPages(count, pageSize)`, the rule every page count in the grid follows (`Math.ceil(count / pageSize)`, reading a `pageSize` below 1 as 1 and a negative `count` as none), for a pager of the app's own to count pages the same way.
