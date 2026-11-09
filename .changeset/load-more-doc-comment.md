---
"@gridkitjs/react": patch
---

`InfiniteScrollConfig.onLoadMore`'s doc comment lists every event that lets
it be called again: `isLoadingMore` going back to `false`, `hasMore`
changing, the sentinel leaving range and coming back, or appended rows moving
the sentinel before `isLoadingMore` read `true`.
