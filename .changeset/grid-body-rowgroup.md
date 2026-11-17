---
"@gridkitjs/react": minor
---

The body's `rowgroup` role moves from its `<tbody>` to the element around
the body's table, `div.gridkit-data-grid-body`, and the `<tbody>` becomes
`role="presentation"`. That element scrolls under `height` and carries
`tabindex="-1"`, and a focusable element inside a grid must have a role the
grid allows. The grid still has three rowgroups, holding the same rows, so
`getByRole("rowgroup")` finds what it did. A test or selector that reads
the role from the `<tbody>` itself reads it from the `div` instead:

```ts
// before
grid.locator("tbody[role=rowgroup]");
// after
grid.locator(".gridkit-data-grid-body[role=rowgroup]");
```
