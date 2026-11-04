---
"@gridkitjs/react": minor
---

`filterMenu.ui: "excel"` — the grid's or a column's — now opens the excel
editor in place of the simple one: a search box, a tri-state "Select all"
checkbox and a checklist of the column's values, in its sort order and
labelled as its cells print, with "(Blanks)" last and, under
`filterMenu.showCounts`, how many rows hold each. The values cascade from the
other columns' filters. The search narrows the list and "Select all" acts on
what it shows; past `filterMenu.valueLimit` values (10,000 by default) the
list waits for a search, then lists the first matches and how many more there
are. The list is windowed, one `listbox` stop for Tab, moved through with the
arrow keys, Home, End, PageUp and PageDown, Space checking a value.

OK, or Enter anywhere but on a button, applies the checked values: every value
checked removes the column's filter, anything less sets one `in` entry, OR-ed
with `isEmpty` while "(Blanks)" stays checked. Conditions or a custom filter
open with every value checked under a note, and stay until a value is changed
and applied. Reopening a column's menu reuses the values it counted until the
rows, the columns or another column's filter change.
