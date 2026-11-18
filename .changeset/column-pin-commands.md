---
"@gridkitjs/core": minor
---

New built-in commands `column.pinStart`, `column.pinEnd` and `column.unpin` pin a header's column to the start or end edge, or unpin it, each hidden where it would change nothing. `defaultContextMenu.header` ends with them, after a separator, so a grid's header menu now offers "Pin to start", "Pin to end" or "Unpin". Their labels are the new `GridMessages` keys `pinToStart`, `pinToEnd` and `unpinColumn`.
