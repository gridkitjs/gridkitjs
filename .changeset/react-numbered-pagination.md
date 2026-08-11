---
"@gridkitjs/react": minor
---

Opt-in numbered pager: `pager={{ variant: "numbered" }}` swaps the built-in pager's "Page X of Y" display for `[Prev][1][2][3]…[n][Next]` page buttons. `pager.boundaryCount` (default `1`) and `pager.siblingCount` (default `1`) control how many pages are always shown at each end and around the current page. Default stays `"compact"` — today's Prev/status/Next — so no existing consumer's rendered output changes.
