---
"@gridkitjs/dom": patch
"@gridkitjs/react": patch
---

A control a `cellTemplate` or `headerTemplate` draws now keeps its keys. Before, the grid took the arrows, Home, End, Space, Enter, Escape and Ctrl+A pressed in it, so a space typed into an input selected the row, and focusing the control with Tab or a click moved focus to its cell. Now a text field, a textarea or a select keeps every key; a button, a link or a checkbox keeps Space and Enter (activating it without selecting the row) while the arrow keys still move the grid's focus; and Escape in any such control returns focus to its cell without clearing the selection. A grid without controls in its cells behaves as before.
