---
"@gridkitjs/react": minor
---

`DataGrid` follows the writing direction of the page it is in, with no new
prop. Inside `dir="rtl"`, the left and right arrows move focus the way they
point in the body, the header, the group-by bar, the toolbar and menus
(`ArrowLeft` moves to the next column), `Ctrl` and `Alt` with an arrow
reorder and resize toward where the arrow points, dragging a column's resize
handle outward grows it, a header dropped on another's right half lands
before it, and menus and panels open aligned with their anchor's right edge,
with submenus opening to the left. Menus and panels take the grid's
direction as they open, through a `dir` attribute on the overlay, even when
only an element around the grid sets `dir="rtl"`. The direction is read when
a key is pressed, a drag starts or an overlay opens, so a page that switches
direction is followed. Left-to-right pages are unaffected.
