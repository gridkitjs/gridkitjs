---
"@gridkitjs/core": patch
---

The `onColumnResize` doc comment no longer claims auto-fit skips it: fitting a column to its content calls it once, with `phase: "end"`.
