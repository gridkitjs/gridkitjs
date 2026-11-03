---
"@gridkitjs/core": minor
---

A `contextMenu` area takes a function as well as entries, asked each time its
menu opens with a `GridContextMenuRequest` — `{ target, defaults, context }`,
the target typed for the area — and returning the entries to show, or `null`
for the browser's menu there. It is how to add to an area's defaults, take
some out, reorder them, or vary the menu by column or row:

```ts
contextMenu: {
  cell: ({ target, defaults }) =>
    target.columnId === "Id" ? null : ["orders.open", "separator", ...defaults],
}
```

For a renderer of its own, `contextMenuEntries(contextMenu, context)` gives
the entries for the place `context.target` names, asking an area's function
if it has one, and `hasContextMenu(contextMenu, area)` says whether an area
opens a grid menu at all. `GridContextMenuEntries` is the type of an area's
option.
