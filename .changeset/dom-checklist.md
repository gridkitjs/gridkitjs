---
"@gridkitjs/dom": minor
---

`attachChecklist(list, { onToggle, onFocusChange, scrollToIndex })` gives a
long, virtualized multi-select list one tab stop: the arrow keys, Home, End,
PageUp and PageDown move focus among its items, focusing one outside the
mounted window once it mounts, and Space or a click reports `onToggle(index)`.
Enter is left to the form around it. It returns `setCount(count)`,
`focusItem(index)` and `detach()`, and sets only `tabindex`; the renderer
draws the `listbox`/`option` roles and `aria-checked`.
