# @gridkitjs/dom

The browser behaviours a GridKit renderer needs, as framework-free
TypeScript: pointer gestures, keyboard focus movement, the observers behind
fit-to-width and infinite scroll, the row virtualizer's measuring, overlays,
and a live-region announcer. Built on
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

| Behaviour                  | What it does                                                                  |
| -------------------------- | ----------------------------------------------------------------------------- |
| `createLiveAnnouncer`      | A polite live region for announcements no visual cue can carry.               |
| `observeElementWidth`      | Reports an element's width, now and on every change.                          |
| `attachInfiniteScroll`     | Calls `onLoadMore` as a sentinel row nears the bottom of the body.            |
| `startColumnResizeGesture` | Drags a column's edge into a new width.                                       |
| `startDragReorder`         | Drags a header or chip to a new place, with the drop-target hit-tests.        |
| `createRowVirtualizer`     | Windows rows of any height down to those near the scroll position.            |
| `createGridFocus`          | Keeps the grid's single tab stop and moves the browser's focus with the keys. |
| `bodyCellFrom` and others  | Resolve a delegated body event to the cell, row or group header it addresses. |
| `attachOverlay`            | Positions a panel beside an anchor or point, and reports when to dismiss it.  |

Full documentation: [github.com/blagojablazhevski/gridkit](https://github.com/blagojablazhevski/gridkit#readme)

## License

MIT © Blagoja Blazhevski
