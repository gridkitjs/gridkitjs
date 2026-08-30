---
"@gridkitjs/react": minor
---

`infiniteScroll`: loads more rows as the user scrolls near the bottom of the grid's body, in place of `paginated`'s page-by-page navigation.

```tsx
<DataGridComponent
  columns={columns}
  dataSource={rows}
  height={400}
  infiniteScroll={{ hasMore, isLoadingMore, onLoadMore }}
/>
```

`hasMore` and `onLoadMore` are required; `isLoadingMore` suppresses further calls while a load is in flight; `rootMargin` (default `"200px"`) tunes how early it fires relative to the grid's own scrollable body; `loadingTemplate` replaces the built-in "Loading more…" row.

Mutually exclusive with `paginated` — setting both logs a dev-time `console.error` and only `paginated` takes effect. Independent of `virtualized`, though pairing the two is the recommended combination for a dataset that grows without bound.
