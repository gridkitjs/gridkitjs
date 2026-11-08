---
"@gridkitjs/react": patch
---

An open filter menu now shows its column's filter when it is set in code while the menu is open, through `setFilter` or a controlled `filter`, as it would on opening the menu again. Before, it kept what was typed or checked, and OK wrote that over the new filter. A change to another column's filter leaves what was typed in the simple editor.
