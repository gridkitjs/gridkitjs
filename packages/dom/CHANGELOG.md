# @gridkitjs/dom

## 0.2.1

### Patch Changes

- Updated dependencies [0cf56d4]
- Updated dependencies [0cf56d4]
  - @gridkitjs/core@0.12.1

## 0.2.0

### Minor Changes

- 183babc: `attachContextMenuTrigger` also asks for a menu on a touch long-press: a
  primary touch resting for half a second without moving, reported as a
  `"pointer"` request at the touch's point. A browser's own `contextmenu` for
  the same press asks only once, and once the long-press opened a menu, the
  click its lifting brings is taken so it does not land in the menu or the cell
  under it.
- 183babc: `attachContextMenuTrigger(root, { onRequest })` reports each context menu the
  user asks for inside `root` — a right-click, Shift+F10 or the ContextMenu
  key — with the element it was asked on, the pointer's position (`null` from
  the keyboard) and how it was asked. `onRequest` answers whether it opened a
  menu, which prevents the browser's own. A key press asks once, even where the
  browser follows it with a `contextmenu` event of its own, and an event a cell
  template already prevented is left to the template.
- 3758583: `attachMenu(panel, options)` makes a `role="menu"` panel a renderer drew
  behave as a menu, following the WAI-ARIA menu pattern. Items are found by
  their menu item role and `data-gridkit-menu-item` id, with one of them the tab
  stop. The arrow keys, Home, End and typeahead move focus among them; Enter,
  Space and a click choose one (`onActivate`), never a disabled one; ArrowRight,
  or the pointer resting on a submenu item, asks for its submenu
  (`onOpenSubmenu`), and ArrowLeft in a submenu asks to close it
  (`onCloseSubmenu`); resting on another item asks to close the open submenu
  (`onCollapseSubmenu`); Tab asks to close every menu (`onClose`). It returns
  `focusItem` and `detach`. Escape stays with `attachOverlay`'s stack, so a
  submenu shown in an overlay of its own above its menu closes alone.
- 4193f42: `attachOverlay` takes two new options and keeps a panel attached as it
  changes size:

  - `initialFocus` — `"first"` (the default, as before), `"panel"`, `"none"` or
    an element — says where focus goes when the overlay attaches.
  - `offset`, also taken by `placeOverlay`, shifts the panel along the anchor's
    edge, so a submenu opened `right-start` can line its first item up with the
    item that opened it.
  - The panel is placed again whenever its own size changes, so a panel flipped
    above its anchor keeps its bottom edge against it as its content shrinks.

- 66c2815: `attachOverlay` takes `ignoreScrollAfterInput`: when `true`, a scroll outside
  the panel in the two animation frames after an `input` or `change` event inside
  it does not dismiss it, so a panel whose controls change the page under it is
  not closed by what they cause. Every other scroll outside the panel still
  dismisses it, and without the option nothing changes.
- 4193f42: Overlays attached with `attachOverlay` now stack in the order they attach, so
  a submenu or a picker can open above the overlay it came from.

  - Escape asks only the topmost overlay to close, and is now consumed: it is
    taken in the capture phase on `window` with `preventDefault()` and
    `stopPropagation()`, so no other listener on the page hears an Escape that
    closed an overlay. With no overlay open, Escape is left alone.
  - A pointer down or a focus move inside an overlay above counts as inside
    every overlay below it.
  - Detaching an overlay dismisses the overlays above it with a new
    `OverlayDismissReason`, `"parent"`, and detaches them. A `switch` over the
    reason that must be exhaustive needs a case for it.

- 5f9a5da: `attachToolbar(toolbar)` makes a `role="toolbar"` element a renderer drew one
  tab stop, following the WAI-ARIA toolbar pattern. Its entries are found by
  `data-gridkit-toolbar-item`, each entry's control being the entry itself or
  the first focusable element in it; ArrowRight and ArrowLeft move between them,
  wrapping, and Home and End go to the ends, passing over separators and
  spacers and keeping `aria-disabled` controls focusable. The tab stop follows
  focus and survives entries coming and going. A text field keeps Home, End and
  the arrows while its caret has text to move through, and the arrows lead out
  of it at either end.
- 66c2815: `ToolbarOverflowItem` takes an optional `label`. When `update` finds an entry's
  label changed while it was in "More", `observeToolbarOverflow` forgets the
  width it remembered for it and measures it afresh, so an entry whose label grew
  shorter comes back out of "More" once it fits. `resolveToolbar`'s items carry
  their labels already.
- 5f9a5da: `observeToolbarOverflow(toolbar, { items, onChange })` measures a toolbar's
  entries and the room it has, and reports how many entries fit — core's
  `fitToolbarItems` count — straight away and whenever that changes: as the
  toolbar or an entry resizes, or as entries are drawn or taken away. Entries
  are found by `data-gridkit-toolbar-item` and the "More" button by
  `data-gridkit-toolbar-more`; an entry moved into "More" keeps the width it
  was last measured at, a spacer counts as nothing, and the toolbar's padding
  and gap are allowed for. It returns `update(options)`, for new items, and
  `detach()`.

### Patch Changes

- 22cf630: An overlay whose anchor element leaves the page while it is open — the header
  of a column a panel just hid — is now placed again beside where the anchor
  last was when its size changes, rather than in the viewport's top-left corner.
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [22cf630]
- Updated dependencies [66c2815]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [1fdf433]
- Updated dependencies [1fdf433]
- Updated dependencies [3758583]
- Updated dependencies [3758583]
- Updated dependencies [db2ba38]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
  - @gridkitjs/core@0.12.0

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
