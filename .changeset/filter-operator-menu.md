---
"@gridkitjs/react": minor
---

The excel filter editor has an operator submenu: a "Text filters" button —
"Number filters", "Date filters" or "Boolean filters", by the column's type —
above its search box opens a menu of the conditions the column offers,
beside the filter menu. Choosing one shows the simple editor's conditions in
place of the checklist, the first at the operator chosen, under a "Back to
values" button that brings the checklist back as it was left; OK there
applies the conditions in place of the column's checked values. While the
column is filtered by conditions, the button is ticked and the operators in
use are checked in its menu; choosing one opens the conditions as applied.
The button follows the menu button pattern (Enter, Space or ArrowDown opens
the menu on its first item, ArrowUp on its last), and Escape or Tab in the
menu closes it alone. A column whose `filterMenu.operators` is empty offers
no menu.

Switching `filterMenu.ui` at runtime keeps every filter: conditions show in
the simple editor or through this menu, checked values in the excel editor.
