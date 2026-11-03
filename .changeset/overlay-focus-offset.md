---
"@gridkitjs/dom": minor
---

`attachOverlay` takes two new options and keeps a panel attached as it
changes size:

- `initialFocus` — `"first"` (the default, as before), `"panel"`, `"none"` or
  an element — says where focus goes when the overlay attaches.
- `offset`, also taken by `placeOverlay`, shifts the panel along the anchor's
  edge, so a submenu opened `right-start` can line its first item up with the
  item that opened it.
- The panel is placed again whenever its own size changes, so a panel flipped
  above its anchor keeps its bottom edge against it as its content shrinks.
