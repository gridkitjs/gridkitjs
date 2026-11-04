# @gridkitjs/dom

The browser behaviours a GridKit renderer needs, as framework-free
TypeScript: pointer gestures, keyboard focus movement, the observers behind
fit-to-width and infinite scroll, the row virtualizer's measuring, overlays
and the menus shown in them, toolbars, and a live-region announcer. Built on
[`@gridkitjs/core`](https://www.npmjs.com/package/@gridkitjs/core) and used by
[`@gridkitjs/react`](https://www.npmjs.com/package/@gridkitjs/react).

> **Early development.** The API is still moving and may break between minor
> versions.

You only need this package to write a renderer of your own. `@gridkitjs/react`
already depends on it, so installing that is enough to use the grid.

```bash
pnpm add @gridkitjs/dom
```

Every behaviour attaches to elements the renderer has drawn, owns its own
listeners and observers, reports through callbacks, and returns the way to end
it — so it maps onto any framework's lifecycle.

```ts
import { createLiveAnnouncer, observeElementWidth } from "@gridkitjs/dom";

const announcer = createLiveAnnouncer(gridElement);
const disconnect = observeElementWidth(gridElement, (width) => {
  controller.setOptions({ ...options, viewportWidth: width });
});

announcer.announce("Amount, column 2 of 5");

// when the grid goes away
disconnect();
announcer.destroy();
```

| Behaviour                  | What it does                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `createLiveAnnouncer`      | A polite live region for announcements no visual cue can carry.                                |
| `observeElementWidth`      | Reports an element's width, now and on every change.                                           |
| `attachInfiniteScroll`     | Calls `onLoadMore` as a sentinel row nears the bottom of the body.                             |
| `startColumnResizeGesture` | Drags a column's edge into a new width.                                                        |
| `startDragReorder`         | Drags a header or chip to a new place, with the drop-target hit-tests.                         |
| `createRowVirtualizer`     | Windows rows of any height down to those near the scroll position.                             |
| `createGridFocus`          | Keeps the grid's single tab stop and moves the browser's focus with the keys.                  |
| `bodyCellFrom` and others  | Resolve a delegated body event to the cell, row or group header it addresses.                  |
| `attachOverlay`            | Positions a panel beside an anchor or point, and reports when to dismiss it.                   |
| `placeOverlay`             | The placement on its own: pure arithmetic over boxes.                                          |
| `attachMenu`               | Moves a menu's focus by key, typeahead and pointer, and reports choices.                       |
| `attachContextMenuTrigger` | Reports a right-click, a touch long-press, Shift+F10 or the ContextMenu key, once per gesture. |
| `attachToolbar`            | Makes a toolbar one tab stop that the arrow keys move within.                                  |
| `observeToolbarOverflow`   | Reports how many of a toolbar's entries fit, for the rest to go in "More".                     |

Overlays stack in the order they attach: Escape and outside clicks reach the
topmost first, and detaching one closes every overlay opened above it, so a
submenu never outlives its menu.

Full documentation: [github.com/gridkitjs/gridkitjs](https://github.com/gridkitjs/gridkitjs#readme)

## License

MIT © Blagoja Blazhevski
