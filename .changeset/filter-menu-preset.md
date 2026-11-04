---
"@gridkitjs/core": minor
---

New `excelFilter` preset: `{ filterableColumns: true, filterMenu: { ui: "excel",
showCounts: true } }`, a plain `GridOptions` value that turns on the
Excel-style filter popup in one spread. Options given after it override it;
`filterMenu` is replaced whole, not merged.
