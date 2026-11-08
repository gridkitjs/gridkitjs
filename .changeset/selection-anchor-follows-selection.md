---
"@gridkitjs/core": patch
---

A Shift-click range no longer starts from a row or column that is no longer selected or no longer on screen. After `clearSelection` (Escape), `setRowSelection`, `setColumnSelection` or a `restoreState` that sets the selection, a Shift-click selected the range from the last row clicked before; it now selects just the row clicked. After paging, filtering or collapsing the last row clicked out of sight, a Shift-click did nothing; it now selects the row clicked. Either way the next Shift-click extends from there. A click while `selectable` turns the axis off no longer moves the anchor either.
