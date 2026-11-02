---
"@gridkitjs/dom": minor
---

`attachInfiniteScroll(root, { sentinel, hasMore, onLoadMore, isLoadingMore,
rootMargin })` calls `onLoadMore` as the sentinel nears the bottom of `root`,
once per approach until a load in flight finishes, and returns `update` and
`detach`.
