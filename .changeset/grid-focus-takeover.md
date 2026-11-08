---
"@gridkitjs/dom": minor
---

`createGridFocus`'s `attach` takes an optional second argument, `root`: the
grid element holding the rows. Given one, a move still waiting for its
virtualized row to mount is dropped when focus leaves `root` or the user
scrolls or presses inside it, so the row mounting later no longer scrolls
the grid back to it or pulls focus back into the grid.

```ts
focus.attach({ getHeaderRow, getBodyRow }, gridElement);
```
