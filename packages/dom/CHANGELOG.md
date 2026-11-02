# @gridkitjs/dom

## 0.1.0

### Minor Changes

- da4fbda: `bodyCellFrom`, `groupRowFrom` and `bodyRowFrom` turn a delegated body event's
  target into the data cell, group-header row or body row it addresses, by the
  grid's `data-gridkit-*` attributes.
- da4fbda: `startColumnResizeGesture(handle, press, session, { onMove, onEnd, onCancel })`
  drags a column's edge with the pointer captured, reporting each width,
  `onEnd(null)` for a click that resized nothing, and `onCancel` on Escape. Only
  the main button of the primary pointer starts it. `measureColumnContent(table,
columnId)` measures the width a column's widest rendered cell needs.
- da4fbda: `startDragReorder(id, grabElement, press, { resolveTarget, onState, onDrop })`
  runs a reorder drag: a 4-pixel threshold before it opens, the ghost's
  `transform`, and the drop target on every move, reported through `onState` and
  reset to `NO_DRAG` when it ends. Only the main button of the primary pointer
  starts one. `resolveColumnDropTarget` and `resolveGroupByDropTarget` hit-test
  the grid's headers and group-by bar.
- da4fbda: `observeElementWidth(element, onWidth)` reports an element's `clientWidth` at
  once and on every change, and returns the function that disconnects it.
- da4fbda: `createGridFocus({ rowCount, columnCount, isSkippableRow, virtualRange })`
  keeps a grid's single tab stop: `getFocus`, `subscribe`, `focusCell`,
  `handleKey(key, modifiers, pageSize)` for the navigation keys, `attach` to the
  rendered rows, and `focusDrawnCell` to move the browser's focus once a move is
  drawn — scrolling a virtualized row into range first. `findBodyRow` and
  `measurePageSize` read the grid's markup.
- da4fbda: `attachInfiniteScroll(root, { sentinel, hasMore, onLoadMore, isLoadingMore,
rootMargin })` calls `onLoadMore` as the sentinel nears the bottom of `root`,
  once per approach until a load in flight finishes, and returns `update` and
  `detach`.
- da4fbda: `createLiveAnnouncer(container?)` adds a visually hidden, polite live region
  (`role="status"`, class `gridkit-sr-only`) and returns `announce(text)` and
  `destroy()`. Announcing the same text twice in a row reads it out twice.
- da4fbda: `attachOverlay(anchor, panel, { placement, gap, onDismiss, returnFocusTo })`
  positions a panel beside an element or a point — flipping to the other side or
  edge when it would run off screen — moves focus into it, and reports
  `onDismiss` on Escape, a pointer down outside it, a scroll, a resize or focus
  leaving it. Detaching returns focus. `placeOverlay` is the placement
  arithmetic on its own.
- da4fbda: New package: `@gridkitjs/dom`, the browser behaviours a GridKit renderer
  attaches to its own markup — pointer gestures, focus movement, observers, row
  virtualization, overlays and a live-region announcer — as framework-free
  TypeScript. You only need it to write a renderer; `@gridkitjs/react` depends
  on it already.
- da4fbda: `createRowVirtualizer(scrollElement, { estimatedRowHeight, overscan, onRange })`
  windows rows of any height down to those near the scroll position, measuring
  each mounted row, and reports the window through `onRange` only when it moves.
  It has `setRowCount`, `resetHeights`, `measureRow(index)` ref callbacks,
  `scrollToIndex` (which corrects itself once an unmounted target mounts) and
  `destroy`.

### Patch Changes

- Updated dependencies [78e10e5]
- Updated dependencies [6af35c6]
- Updated dependencies [6af35c6]
- Updated dependencies [bad8ea3]
- Updated dependencies [bad8ea3]
- Updated dependencies [78e10e5]
- Updated dependencies [44759b4]
- Updated dependencies [bad8ea3]
- Updated dependencies [8d411eb]
- Updated dependencies [bad8ea3]
- Updated dependencies [78e10e5]
- Updated dependencies [44759b4]
- Updated dependencies [bad8ea3]
- Updated dependencies [8d411eb]
  - @gridkitjs/core@0.11.0
