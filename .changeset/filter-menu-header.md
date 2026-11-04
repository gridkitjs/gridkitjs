---
"@gridkitjs/react": minor
---

A filterable header shows a filter button beside its sort toggle, which opens
the column's filter menu and closes it pressed again, and
`Alt+Shift+ArrowDown` on a focused header opens it too, listed in the
header's `aria-keyshortcuts`. While the column is filtered the button carries
`is-filtered` and the header `aria-description="Filtered"` (the
`columnFiltered` message), whatever set the filter. A column without a filter
menu shows neither, however it is filtered.

`Alt+Shift+ArrowDown` on a groupable header no longer groups it: grouping
takes `Alt+ArrowDown` alone, as its `aria-keyshortcuts` always said.
