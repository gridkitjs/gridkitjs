---
"@gridkitjs/dom": minor
"@gridkitjs/react": minor
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

Dragging a header shows where it can go when columns are pinned. A column
only moves within its pin group, and the drop line, the drop, the keyboard
move and its announcement now agree with that:

- `ColumnDropContext` takes an optional `pinOf(columnId)`, the edge each
  column is pinned to. With it, `resolveColumnDropTarget` returns `null` over
  a header in another pin group, and only targets that would move the column
  within its own group.
- While a header is dragged, the headers of the other pin groups carry
  `is-drag-blocked`, which the theme draws with a muted label and a
  `not-allowed` cursor. The gap at the end of a group is marked
  `is-drop-after` on its last header rather than `is-drop-before` on the next
  group's first.
- Ctrl+Arrow on a header at its group's edge does
  nothing; it announced a move that never happened. A move within a group
  announces the column's position on screen.
