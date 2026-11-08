---
"@gridkitjs/core": patch
---

`clearSelection` clears rows, columns and the cell as one change: subscribers are called once, after every selection callback, rather than once per selection with the half-cleared states in between.
