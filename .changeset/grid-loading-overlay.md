---
"@gridkitjs/react": minor
---

`DataGrid` takes `loading`: while it is `true`, a translucent overlay covers the body with `messages.loading` ("Loading…"), over the rows already drawn, which keep their places, so the grid does not jump when the new rows arrive. The header, toolbar and pager are not covered and stay usable; a click on the body selects nothing and fires no row event, and keyboard focus stays where it was. The grid element carries `aria-busy="true"`, and the message is announced once as loading starts. While loading, the empty message does not show. A grid that never sets `loading` renders as before.

The new `loadingTemplate` prop replaces the overlay's message. It is separate from `infiniteScroll.loadingTemplate`, which still draws infinite scroll's own loading row.

The overlay is `div.gridkit-grid-loading-overlay[role=row]`, `.is-empty` while there are no rows beneath it, holding `div.gridkit-grid-loading-overlay-content[role=gridcell]`, which carries `--gridkit-loading-width`. Like the empty row, it has no `aria-rowindex` and is not counted in `aria-rowcount`.
