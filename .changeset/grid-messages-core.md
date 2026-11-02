---
"@gridkitjs/core": minor
---

`GridOptions` gains `messages`, a partial `GridMessages` replacing the grid's
own English strings key by key — the pager, the group-by bar, the loading
row, boolean and blank values, and every live-region announcement.
`defaultMessages` holds the English defaults and `resolveMessages(messages)`
lays a partial set over them. `formatCellValue` takes an optional fifth
`messages` argument for a boolean's words.
