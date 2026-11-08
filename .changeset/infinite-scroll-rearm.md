---
"@gridkitjs/dom": patch
---

`attachInfiniteScroll` no longer stops loading for good after a load that
never reported `isLoadingMore: true`, such as one that finished within a
single render or an `onLoadMore` that started nothing. A load is now
re-armed when it finishes, when `hasMore` changes (a new dataset loads
again while the sentinel is in range), or when the sentinel leaves
`rootMargin` and comes back. An `update` after `detach()` does nothing,
where it used to start observing again.
