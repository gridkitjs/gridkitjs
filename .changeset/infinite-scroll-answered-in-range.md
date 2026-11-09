---
"@gridkitjs/dom": patch
---

`attachInfiniteScroll` loads again when a load that never reported
`isLoadingMore: true` adds rows that leave the sentinel in range. Such a load,
one that finishes within a single render, used to stop loading until the
sentinel was scrolled out of range and back. While a request is outstanding,
an `update` now notices rows moving the sentinel and loads again if it is
still in range; an update that moves nothing still doesn't repeat the request.
