---
"@gridkitjs/dom": minor
---

`attachContextMenuTrigger(root, { onRequest })` reports each context menu the
user asks for inside `root` — a right-click, Shift+F10 or the ContextMenu
key — with the element it was asked on, the pointer's position (`null` from
the keyboard) and how it was asked. `onRequest` answers whether it opened a
menu, which prevents the browser's own. A key press asks once, even where the
browser follows it with a `contextmenu` event of its own, and an event a cell
template already prevented is left to the template.
